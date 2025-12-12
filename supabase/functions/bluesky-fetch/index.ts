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
  const maxIterations = 30; // Increased to fetch more posts

  console.log(`Fetching all posts for ${actor} from ${targetYear}`);

  while (iterations < maxIterations) {
    iterations++;
    const url = new URL(`${BLUESKY_API}/app.bsky.feed.getAuthorFeed`);
    url.searchParams.set("actor", actor);
    url.searchParams.set("limit", String(limit));
    // Include replies to get full post count
    url.searchParams.set("filter", "posts_with_replies");
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
    
    if (posts.length === 0) break;

    let postsFromYear = 0;
    let foundOlderPost = false;
    
    for (const item of posts) {
      const createdAt = new Date(item.post.record?.createdAt);
      const postYear = createdAt.getFullYear();
      
      if (postYear === targetYear) {
        allPosts.push(item);
        postsFromYear++;
      } else if (postYear < targetYear) {
        foundOlderPost = true;
        break;
      }
      // Posts from future years (shouldn't happen) are skipped
    }

    console.log(`Iteration ${iterations}: fetched ${posts.length} posts, ${postsFromYear} from ${targetYear}, ${allPosts.length} total`);

    if (foundOlderPost || !data.cursor) break;
    cursor = data.cursor;
  }

  console.log(`Total posts fetched from ${targetYear}: ${allPosts.length}`);
  return allPosts;
}

async function getPostLikes(session: BlueskySession, uri: string, limit = 100) {
  const allLikes: any[] = [];
  let cursor: string | undefined;
  
  try {
    // Fetch up to 2 pages of likes
    for (let i = 0; i < 2; i++) {
      const url = new URL(`${BLUESKY_API}/app.bsky.feed.getLikes`);
      url.searchParams.set("uri", uri);
      url.searchParams.set("limit", String(limit));
      if (cursor) url.searchParams.set("cursor", cursor);

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${session.accessJwt}` },
      });

      if (!response.ok) break;
      const data = await response.json();
      allLikes.push(...(data.likes || []));
      
      if (!data.cursor) break;
      cursor = data.cursor;
    }
    return allLikes;
  } catch {
    return allLikes;
  }
}

async function getPostReposts(session: BlueskySession, uri: string, limit = 100) {
  const allReposts: any[] = [];
  let cursor: string | undefined;
  
  try {
    // Fetch up to 2 pages of reposts
    for (let i = 0; i < 2; i++) {
      const url = new URL(`${BLUESKY_API}/app.bsky.feed.getRepostedBy`);
      url.searchParams.set("uri", uri);
      url.searchParams.set("limit", String(limit));
      if (cursor) url.searchParams.set("cursor", cursor);

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${session.accessJwt}` },
      });

      if (!response.ok) break;
      const data = await response.json();
      allReposts.push(...(data.repostedBy || []));
      
      if (!data.cursor) break;
      cursor = data.cursor;
    }
    return allReposts;
  } catch {
    return allReposts;
  }
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

async function getTopFans(session: BlueskySession, posts: any[], profileDid: string) {
  const fanCounts: Record<string, { 
    handle: string; 
    displayName: string; 
    avatar: string; 
    likes: number; 
    reposts: number;
  }> = {};

  // Get interactions for top 50 posts by engagement to capture more fan data
  const sortedPosts = [...posts]
    .sort((a, b) => {
      const engA = (a.post.likeCount || 0) + (a.post.repostCount || 0);
      const engB = (b.post.likeCount || 0) + (b.post.repostCount || 0);
      return engB - engA;
    })
    .slice(0, 50);

  console.log(`Fetching fans from top ${sortedPosts.length} posts`);

  for (const item of sortedPosts) {
    const uri = item.post.uri;
    
    const [likes, reposts] = await Promise.all([
      getPostLikes(session, uri),
      getPostReposts(session, uri),
    ]);

    for (const like of likes) {
      const actor = like.actor;
      if (actor.did === profileDid) continue; // Skip self
      
      if (!fanCounts[actor.did]) {
        fanCounts[actor.did] = {
          handle: actor.handle,
          displayName: actor.displayName || actor.handle,
          avatar: actor.avatar || "",
          likes: 0,
          reposts: 0,
        };
      }
      fanCounts[actor.did].likes++;
    }

    for (const reposter of reposts) {
      if (reposter.did === profileDid) continue;
      
      if (!fanCounts[reposter.did]) {
        fanCounts[reposter.did] = {
          handle: reposter.handle,
          displayName: reposter.displayName || reposter.handle,
          avatar: reposter.avatar || "",
          likes: 0,
          reposts: 0,
        };
      }
      fanCounts[reposter.did].reposts++;
    }
  }

  // Sort by total interactions (reposts weighted higher)
  const topFans = Object.values(fanCounts)
    .map(fan => ({
      ...fan,
      score: fan.likes + fan.reposts * 2,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  console.log(`Found ${topFans.length} top fans`);
  return topFans;
}

function analyzeTopics(posts: any[]) {
  // Common words to exclude
  const stopWords = new Set([
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with',
    'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her',
    'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up',
    'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time',
    'no', 'just', 'him', 'know', 'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could',
    'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think',
    'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way', 'even',
    'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us', 'very', 'really', 'been',
    'being', 'dont', 'much', 'here', 'got', 'going', 'thing', 'yeah', 'right', 'still', 'though',
    'https', 'http', 'www', 'com', 'bsky', 'social'
  ]);

  const wordCounts: Record<string, number> = {};
  const bigramCounts: Record<string, number> = {};

  posts.forEach((item: any) => {
    const text = (item.post.record?.text || "").toLowerCase();
    // Remove URLs
    const cleanText = text.replace(/https?:\/\/[^\s]+/g, '');
    const words = cleanText.split(/\s+/).filter((w: string) => {
      const cleaned = w.replace(/[^a-z]/g, '');
      return cleaned.length > 3 && !stopWords.has(cleaned);
    }).map((w: string) => w.replace(/[^a-z]/g, ''));

    // Count single words
    words.forEach((word: string) => {
      if (word.length > 3) {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    });

    // Count bigrams (two-word phrases)
    for (let i = 0; i < words.length - 1; i++) {
      if (words[i].length > 3 && words[i + 1].length > 3) {
        const bigram = `${words[i]} ${words[i + 1]}`;
        bigramCounts[bigram] = (bigramCounts[bigram] || 0) + 1;
      }
    }
  });

  // Get top words
  const topWords = Object.entries(wordCounts)
    .filter(([_, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }));

  // Get top bigrams that appear at least twice
  const topBigrams = Object.entries(bigramCounts)
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([phrase, count]) => ({ phrase, count }));

  return { topWords, topBigrams };
}

async function analyzeRecap(session: BlueskySession, posts: any[], profile: any, targetYear: number) {
  const ownPosts = posts.filter((item: any) => item.post.author.did === profile.did);

  const totalPosts = ownPosts.length;
  const totalLikes = ownPosts.reduce((sum: number, item: any) => sum + (item.post.likeCount || 0), 0);
  const totalReposts = ownPosts.reduce((sum: number, item: any) => sum + (item.post.repostCount || 0), 0);
  const totalReplies = ownPosts.reduce((sum: number, item: any) => sum + (item.post.replyCount || 0), 0);

  let topPostByEngagement = ownPosts[0];
  let maxEngagement = 0;

  ownPosts.forEach((item: any) => {
    const engagement = (item.post.likeCount || 0) + (item.post.repostCount || 0) * 2 + (item.post.replyCount || 0);
    if (engagement > maxEngagement) {
      maxEngagement = engagement;
      topPostByEngagement = item;
    }
  });

  // Patterns
  const monthCounts: Record<string, number> = {};
  const dayCounts: Record<string, number> = {};
  const hourCounts: Record<number, number> = {};
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

  // Longest streak
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

  const avgEngagement = totalPosts > 0 ? Math.round((totalLikes + totalReposts + totalReplies) / totalPosts) : 0;

  // Get top fans and topics
  console.log("Analyzing top fans...");
  const topFans = await getTopFans(session, ownPosts, profile.did);
  
  console.log("Analyzing topics...");
  const topics = analyzeTopics(ownPosts);

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
    patterns: {
      mostActiveMonth,
      mostActiveDay,
      peakHour: parseInt(peakHour),
      longestStreak,
    },
    topFans,
    topics,
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

    const recap = await analyzeRecap(session, posts, profile, currentYear);

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
