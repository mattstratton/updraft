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

async function getAllAuthorPosts(session: BlueskySession, actor: string, targetYear: number) {
  const allPosts: any[] = [];
  let cursor: string | undefined;
  const limit = 100;
  let iterations = 0;
  const maxIterations = 20; // Safety limit to prevent infinite loops

  console.log(`Fetching all posts for ${actor} from ${targetYear}`);

  while (iterations < maxIterations) {
    iterations++;
    const url = new URL(`${BLUESKY_API}/app.bsky.feed.getAuthorFeed`);
    url.searchParams.set("actor", actor);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("filter", "posts_no_replies");
    if (cursor) {
      url.searchParams.set("cursor", cursor);
    }

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${session.accessJwt}` },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Feed fetch error:", error);
      throw new Error(`Failed to fetch feed: ${response.status}`);
    }

    const data = await response.json();
    const posts = data.feed || [];
    
    if (posts.length === 0) {
      console.log("No more posts found");
      break;
    }

    // Filter for target year posts
    let foundOlderPost = false;
    for (const item of posts) {
      const createdAt = new Date(item.post.record?.createdAt);
      const postYear = createdAt.getFullYear();
      
      if (postYear === targetYear) {
        allPosts.push(item);
      } else if (postYear < targetYear) {
        // We've gone past the target year, stop fetching
        foundOlderPost = true;
        break;
      }
    }

    console.log(`Iteration ${iterations}: fetched ${posts.length} posts, ${allPosts.length} total from ${targetYear}`);

    if (foundOlderPost || !data.cursor) {
      break;
    }

    cursor = data.cursor;
  }

  console.log(`Total posts fetched from ${targetYear}: ${allPosts.length}`);
  return allPosts;
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

function analyzeRecap(posts: any[], profile: any, targetYear: number) {
  // Filter to only user's own posts (not reposts)
  const ownPosts = posts.filter((item: any) => item.post.author.did === profile.did);

  const totalPosts = ownPosts.length;
  const totalLikes = ownPosts.reduce((sum: number, item: any) => sum + (item.post.likeCount || 0), 0);
  const totalReposts = ownPosts.reduce((sum: number, item: any) => sum + (item.post.repostCount || 0), 0);
  const totalReplies = ownPosts.reduce((sum: number, item: any) => sum + (item.post.replyCount || 0), 0);

  // Find top posts by different metrics
  let topPostByLikes = ownPosts[0];
  let topPostByEngagement = ownPosts[0];
  let maxLikes = 0;
  let maxEngagement = 0;

  ownPosts.forEach((item: any) => {
    const likes = item.post.likeCount || 0;
    const engagement = likes + (item.post.repostCount || 0) * 2 + (item.post.replyCount || 0);
    
    if (likes > maxLikes) {
      maxLikes = likes;
      topPostByLikes = item;
    }
    if (engagement > maxEngagement) {
      maxEngagement = engagement;
      topPostByEngagement = item;
    }
  });

  // Analyze posting patterns
  const monthCounts: Record<string, number> = {};
  const dayCounts: Record<string, number> = {};
  const hourCounts: Record<number, number> = {};
  
  // Calculate streaks
  const postDates = new Set<string>();
  
  ownPosts.forEach((item: any) => {
    const date = new Date(item.post.record?.createdAt);
    const month = date.toLocaleString('default', { month: 'long' });
    const day = date.toLocaleString('default', { weekday: 'long' });
    const hour = date.getHours();
    const dateStr = date.toISOString().split('T')[0];
    
    monthCounts[month] = (monthCounts[month] || 0) + 1;
    dayCounts[day] = (dayCounts[day] || 0) + 1;
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    postDates.add(dateStr);
  });

  const mostActiveMonth = Object.entries(monthCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Unknown";
  const mostActiveDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Unknown";
  const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "12";

  // Calculate longest streak
  const sortedDates = Array.from(postDates).sort();
  let longestStreak = 0;
  let currentStreak = 1;
  
  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = new Date(sortedDates[i - 1]);
    const currDate = new Date(sortedDates[i]);
    const diffDays = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      currentStreak++;
    } else {
      longestStreak = Math.max(longestStreak, currentStreak);
      currentStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, currentStreak);

  // Calculate average engagement per post
  const avgEngagement = totalPosts > 0 ? Math.round((totalLikes + totalReposts + totalReplies) / totalPosts) : 0;

  // Find most used words/themes (simple word frequency)
  const wordCounts: Record<string, number> = {};
  ownPosts.forEach((item: any) => {
    const text = item.post.record?.text || "";
    const words = text.toLowerCase().split(/\s+/).filter((w: string) => w.length > 4);
    words.forEach((word: string) => {
      const cleaned = word.replace(/[^a-z]/g, '');
      if (cleaned.length > 4) {
        wordCounts[cleaned] = (wordCounts[cleaned] || 0) + 1;
      }
    });
  });
  const topWords = Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);

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
      avgEngagement,
      daysActive: postDates.size,
    },
    topPost: topPostByEngagement ? {
      text: topPostByEngagement.post.record?.text || "",
      likes: topPostByEngagement.post.likeCount || 0,
      reposts: topPostByEngagement.post.repostCount || 0,
      replies: topPostByEngagement.post.replyCount || 0,
      uri: topPostByEngagement.post.uri,
    } : null,
    topPostByLikes: topPostByLikes ? {
      text: topPostByLikes.post.record?.text || "",
      likes: topPostByLikes.post.likeCount || 0,
    } : null,
    patterns: {
      mostActiveMonth,
      mostActiveDay,
      peakHour: parseInt(peakHour),
      longestStreak,
      topWords,
    },
    year: targetYear,
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

    const currentYear = new Date().getFullYear();
    
    const [posts, profile] = await Promise.all([
      getAllAuthorPosts(session, handle, currentYear),
      getProfile(session, handle),
    ]);

    const recap = analyzeRecap(posts, profile, currentYear);

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
