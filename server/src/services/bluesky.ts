// Bluesky API service - handles all Bluesky API interactions

const BLUESKY_API = "https://bsky.social/xrpc";

interface BlueskySession {
  accessJwt: string;
  refreshJwt: string;
  handle: string;
  did: string;
}

async function createSession(): Promise<BlueskySession> {
  const identifier = process.env.BLUESKY_IDENTIFIER;
  const password = process.env.BLUESKY_APP_PASSWORD;

  if (!identifier || !password) {
    console.error("Environment check:", {
      hasIdentifier: !!identifier,
      hasPassword: !!password,
      identifierLength: identifier?.length || 0,
      passwordLength: password?.length || 0,
    });
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
  const maxIterations = 100; // Increased significantly to handle very active users
  const yearStart = new Date(targetYear, 0, 1).getTime();
  const yearEnd = new Date(targetYear + 1, 0, 1).getTime();
  let foundPostsFromYear = false; // Track if we've found any posts from target year
  let consecutivePagesWithoutTargetYear = 0;
  const maxConsecutivePagesWithoutTargetYear = 5; // Stop after 5 consecutive pages with no target year posts

  console.log(`Fetching all posts for ${actor} from ${targetYear} (year range: ${new Date(yearStart).toISOString()} to ${new Date(yearEnd).toISOString()})`);

  while (iterations < maxIterations) {
    iterations++;
    const url = new URL(`${BLUESKY_API}/app.bsky.feed.getAuthorFeed`);
    url.searchParams.set("actor", actor);
    url.searchParams.set("limit", String(limit));
    // No filter = includes all posts (top-level posts AND replies)
    // This gives us the complete count of all user activity
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
      console.log("No more posts in feed");
      break;
    }

    let postsFromYear = 0;
    let hasOlderPosts = false;
    let oldestPostTime: number | null = null;
    
    for (const item of posts) {
      const createdAt = new Date(item.post.record?.createdAt);
      const postTime = createdAt.getTime();
      
      // Track the oldest post in this batch
      if (oldestPostTime === null || postTime < oldestPostTime) {
        oldestPostTime = postTime;
      }
      
      // Check if post is within the target year (inclusive of start, exclusive of end)
      if (postTime >= yearStart && postTime < yearEnd) {
        allPosts.push(item);
        postsFromYear++;
        foundPostsFromYear = true;
      } else if (postTime < yearStart) {
        hasOlderPosts = true;
      }
      // Posts from future years (shouldn't happen) are skipped
    }

    // Track consecutive pages without target year posts
    if (postsFromYear > 0) {
      consecutivePagesWithoutTargetYear = 0;
    } else {
      consecutivePagesWithoutTargetYear++;
    }

    console.log(`Iteration ${iterations}: fetched ${posts.length} posts, ${postsFromYear} from ${targetYear}, ${allPosts.length} total. Oldest: ${oldestPostTime ? new Date(oldestPostTime).toISOString() : 'N/A'}, Consecutive pages without target year: ${consecutivePagesWithoutTargetYear}`);

    // Stop if:
    // 1. No more cursor (reached end of feed)
    // 2. We've found target year posts AND we've gone several consecutive pages without finding more AND we have older posts
    //    This means we've definitely passed the target year
    if (!data.cursor) {
      console.log("Reached end of feed (no more cursor)");
      break;
    }
    
    // Only stop if:
    // - We've found some target year posts (so we know we've entered that year)
    // - AND we've gone several consecutive pages without finding more
    // - AND we have older posts (meaning we've definitely passed the target year)
    if (foundPostsFromYear && 
        consecutivePagesWithoutTargetYear >= maxConsecutivePagesWithoutTargetYear && 
        hasOlderPosts) {
      console.log(`Stopping: Found ${allPosts.length} target year posts, but now ${consecutivePagesWithoutTargetYear} consecutive pages without target year posts, and oldest post (${oldestPostTime ? new Date(oldestPostTime).toISOString() : 'N/A'}) is before ${targetYear}`);
      break;
    }
    
    cursor = data.cursor;
  }

  // Warn if we hit the iteration limit - this means we might have truncated data
  if (iterations >= maxIterations) {
    console.warn(`⚠️ WARNING: Hit max iterations (${maxIterations}). May have truncated posts for very active users. Fetched ${allPosts.length} posts.`);
  }

  console.log(`Total posts fetched from ${targetYear}: ${allPosts.length} (after ${iterations} iterations)`);
  return { posts: allPosts, iterations };
}

async function getPostLikes(session: BlueskySession, uri: string, limit = 100) {
  const allLikes: any[] = [];
  let cursor: string | undefined;
  
  try {
    // Fetch up to 1 page of likes (100 items) to balance speed and data
    for (let i = 0; i < 1; i++) {
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
    // Fetch up to 1 page of reposts (100 items) to balance speed and data
    for (let i = 0; i < 1; i++) {
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

  // Get interactions for top 20 posts by engagement to balance speed and accuracy
  // Reduced from 50 to avoid timeouts for very active users
  const sortedPosts = [...posts]
    .sort((a, b) => {
      const engA = (a.post.likeCount || 0) + (a.post.repostCount || 0);
      const engB = (b.post.likeCount || 0) + (b.post.repostCount || 0);
      return engB - engA;
    })
    .slice(0, 20);

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

async function analyzeRecap(session: BlueskySession, posts: any[], profile: any, targetYear: number, fetchedIterations?: number, maxIterations?: number) {
  console.log(`Analyzing recap: ${posts.length} total posts fetched, profile DID: ${profile.did}`);
  
  const ownPosts = posts.filter((item: any) => item.post.author.did === profile.did);
  
  console.log(`After filtering by author DID: ${ownPosts.length} posts from ${targetYear}`);
  console.log(`Sample post author DIDs: ${posts.slice(0, 5).map((p: any) => p.post.author.did).join(', ')}`);

  // Log if we might have truncated data
  if (fetchedIterations !== undefined && maxIterations !== undefined && fetchedIterations >= maxIterations) {
    console.warn(`⚠️ Potential data truncation: Fetched ${fetchedIterations} iterations (max: ${maxIterations}). Stats may be incomplete for very active users.`);
  }

  // Calculate totals from ALL fetched posts
  // Note: likeCount, repostCount, and replyCount on each post are the current total counts for that post
  // So these should be accurate as long as we fetched all posts from the year
  const totalPosts = ownPosts.length;
  const totalLikes = ownPosts.reduce((sum: number, item: any) => sum + (item.post.likeCount || 0), 0);
  const totalReposts = ownPosts.reduce((sum: number, item: any) => sum + (item.post.repostCount || 0), 0);
  const totalReplies = ownPosts.reduce((sum: number, item: any) => sum + (item.post.replyCount || 0), 0);
  
  console.log(`Calculated totals: ${totalPosts} posts, ${totalLikes} likes, ${totalReposts} reposts, ${totalReplies} replies`);

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

  // Check if data was potentially truncated
  const isTruncated = fetchedIterations !== undefined && maxIterations !== undefined && fetchedIterations >= maxIterations;

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
    truncated: isTruncated,
    _debug: {
      totalPostsFetched: posts.length,
      totalPostsAfterFilter: ownPosts.length,
      iterations: fetchedIterations,
      maxIterations: maxIterations,
    },
  };
}

// Main function to generate a recap for a Bluesky handle
export async function generateRecap(handle: string) {
  console.log(`Fetching recap for handle: ${handle}`);

  const session = await createSession();
  console.log("Session created successfully");

  const currentYear = new Date().getFullYear();
  
  // Fetch posts and track iteration count
  const postsResult = await getAllAuthorPosts(session, handle, currentYear);
  const posts = postsResult.posts;
  const iterations = postsResult.iterations;
  const maxIterations = 100; // Should match the value in getAllAuthorPosts
  
  const profile = await getProfile(session, handle);

  const recap = await analyzeRecap(session, posts, profile, currentYear, iterations, maxIterations);

  return recap;
}

