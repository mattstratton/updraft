import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BLUESKY_API = "https://bsky.social/xrpc";

interface BlueskySession {
  accessJwt: string;
  refreshJwt: string;
  handle: string;
  did: string;
}

async function createSession(): Promise<BlueskySession> {
  const identifier = Deno.env.get("BLUESKY_IDENTIFIER");
  const password = Deno.env.get("BLUESKY_APP_PASSWORD");

  if (!identifier || !password) {
    throw new Error("Missing Bluesky credentials");
  }

  const response = await fetch(`${BLUESKY_API}/com.atproto.server.createSession`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Bluesky auth error:", error);
    throw new Error(`Failed to authenticate with Bluesky: ${response.status}`);
  }

  return response.json();
}

async function getAuthorFeed(session: BlueskySession, actor: string, limit = 100) {
  const response = await fetch(
    `${BLUESKY_API}/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(actor)}&limit=${limit}`,
    {
      headers: { Authorization: `Bearer ${session.accessJwt}` },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("Feed fetch error:", error);
    throw new Error(`Failed to fetch feed: ${response.status}`);
  }

  return response.json();
}

async function getProfile(session: BlueskySession, actor: string) {
  const response = await fetch(
    `${BLUESKY_API}/app.bsky.actor.getProfile?actor=${encodeURIComponent(actor)}`,
    {
      headers: { Authorization: `Bearer ${session.accessJwt}` },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("Profile fetch error:", error);
    throw new Error(`Failed to fetch profile: ${response.status}`);
  }

  return response.json();
}

function analyzeRecap(feed: any[], profile: any) {
  const currentYear = new Date().getFullYear();
  const posts = feed.filter((item: any) => {
    const post = item.post;
    const createdAt = new Date(post.record?.createdAt);
    return createdAt.getFullYear() === currentYear && post.author.did === profile.did;
  });

  const totalPosts = posts.length;
  const totalLikes = posts.reduce((sum: number, item: any) => sum + (item.post.likeCount || 0), 0);
  const totalReposts = posts.reduce((sum: number, item: any) => sum + (item.post.repostCount || 0), 0);
  const totalReplies = posts.reduce((sum: number, item: any) => sum + (item.post.replyCount || 0), 0);

  // Find top post
  let topPost = posts[0];
  let maxEngagement = 0;
  posts.forEach((item: any) => {
    const engagement = (item.post.likeCount || 0) + (item.post.repostCount || 0) * 2 + (item.post.replyCount || 0);
    if (engagement > maxEngagement) {
      maxEngagement = engagement;
      topPost = item;
    }
  });

  // Analyze posting patterns
  const monthCounts: Record<string, number> = {};
  const dayCounts: Record<string, number> = {};
  
  posts.forEach((item: any) => {
    const date = new Date(item.post.record?.createdAt);
    const month = date.toLocaleString('default', { month: 'long' });
    const day = date.toLocaleString('default', { weekday: 'long' });
    monthCounts[month] = (monthCounts[month] || 0) + 1;
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  });

  const mostActiveMonth = Object.entries(monthCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Unknown";
  const mostActiveDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Unknown";

  return {
    profile: {
      handle: profile.handle,
      displayName: profile.displayName || profile.handle,
      avatar: profile.avatar,
      followersCount: profile.followersCount || 0,
      followsCount: profile.followsCount || 0,
    },
    stats: {
      totalPosts,
      totalLikes,
      totalReposts,
      totalReplies,
      totalEngagement: totalLikes + totalReposts + totalReplies,
    },
    topPost: topPost ? {
      text: topPost.post.record?.text || "",
      likes: topPost.post.likeCount || 0,
      reposts: topPost.post.repostCount || 0,
      replies: topPost.post.replyCount || 0,
    } : null,
    patterns: {
      mostActiveMonth,
      mostActiveDay,
    },
    year: currentYear,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { handle } = await req.json();
    
    if (!handle) {
      return new Response(
        JSON.stringify({ error: "Handle is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Fetching recap for handle: ${handle}`);

    const session = await createSession();
    console.log("Session created successfully");

    const [feedData, profile] = await Promise.all([
      getAuthorFeed(session, handle),
      getProfile(session, handle),
    ]);

    console.log(`Fetched ${feedData.feed?.length || 0} posts`);

    const recap = analyzeRecap(feedData.feed || [], profile);

    return new Response(JSON.stringify(recap), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in bluesky-fetch:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
