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

  return response.json() as Promise<BlueskySession>;
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

    const data = await response.json() as { feed?: any[]; cursor?: string };
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
    // Fetch up to 3 pages of likes (300 items) to get more comprehensive data
    for (let i = 0; i < 3; i++) {
      const url = new URL(`${BLUESKY_API}/app.bsky.feed.getLikes`);
      url.searchParams.set("uri", uri);
      url.searchParams.set("limit", String(limit));
      if (cursor) url.searchParams.set("cursor", cursor);

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${session.accessJwt}` },
      });

      if (!response.ok) break;
      const data = await response.json() as { likes?: any[]; cursor?: string };
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
    // Fetch up to 3 pages of reposts (300 items) to get more comprehensive data
    for (let i = 0; i < 3; i++) {
      const url = new URL(`${BLUESKY_API}/app.bsky.feed.getRepostedBy`);
      url.searchParams.set("uri", uri);
      url.searchParams.set("limit", String(limit));
      if (cursor) url.searchParams.set("cursor", cursor);

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${session.accessJwt}` },
      });

      if (!response.ok) break;
      const data = await response.json() as { repostedBy?: any[]; cursor?: string };
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

  return response.json() as Promise<any>;
}

async function getTopFans(session: BlueskySession, posts: any[], profileDid: string) {
  const fanCounts: Record<string, { 
    handle: string; 
    displayName: string; 
    avatar: string; 
    likes: number; 
    reposts: number;
  }> = {};

  // Get interactions for top 50 posts by engagement to get more comprehensive fan data
  // This analyzes more posts to capture fans who engage across multiple posts
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
  // Comprehensive list of common words to exclude
  const stopWords = new Set([
    // Articles and basic words
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from',
    'as', 'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'cant', 'cannot',
    
    // Pronouns
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'this', 'that',
    'these', 'those', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'mine', 'yours', 'hers', 'ours', 'theirs',
    
    // Common verbs (including gerunds and variations)
    'get', 'got', 'gets', 'getting', 'go', 'goes', 'went', 'gone', 'going', 'come', 'comes', 'came', 'coming',
    'see', 'saw', 'seen', 'sees', 'seeing', 'know', 'knew', 'known', 'knows', 'knowing',
    'think', 'thinks', 'thought', 'thinking', 'say', 'says', 'said', 'saying', 'tell', 'tells', 'told', 'telling',
    'make', 'makes', 'made', 'making', 'take', 'takes', 'took', 'taken', 'taking',
    'give', 'gives', 'gave', 'given', 'giving', 'use', 'uses', 'used', 'using', 'want', 'wants', 'wanted', 'wanting',
    'need', 'needs', 'needed', 'needing', 'try', 'tries', 'tried', 'trying', 'look', 'looks', 'looked', 'looking',
    'find', 'finds', 'found', 'finding', 'work', 'works', 'worked', 'working', 'play', 'plays', 'played', 'playing',
    'call', 'calls', 'called', 'calling', 'ask', 'asks', 'asked', 'asking',
    'like', 'likes', 'liked', 'liking', 'feel', 'feels', 'felt', 'feeling', 'mean', 'means', 'meant', 'meaning',
    'keep', 'keeps', 'kept', 'keeping', 'let', 'lets', 'let', 'letting', 'put', 'puts', 'put', 'putting',
    'show', 'shows', 'showed', 'shown', 'showing', 'seem', 'seems', 'seemed', 'seeming',
    
    // Common adjectives/adverbs
    'more', 'most', 'much', 'many', 'some', 'any', 'all', 'both', 'each', 'every', 'few', 'little', 'less', 'least',
    'very', 'really', 'quite', 'too', 'so', 'just', 'only', 'even', 'still', 'also', 'already', 'yet', 'again',
    'good', 'better', 'best', 'bad', 'worse', 'worst', 'big', 'small', 'large', 'long', 'short', 'high', 'low',
    'new', 'old', 'young', 'first', 'last', 'next', 'same', 'different', 'other', 'another',
    'right', 'wrong', 'true', 'false', 'sure', 'maybe', 'probably', 'actually', 'really',
    'cool', 'nice', 'great', 'awesome', 'amazing', 'interesting', 'funny', 'weird', 'strange', 'weird',
    'easy', 'hard', 'simple', 'complex', 'important', 'special', 'normal', 'usual', 'common', 'rare',
    
    // Common nouns (generic)
    'thing', 'things', 'stuff', 'way', 'ways', 'time', 'times', 'day', 'days', 'today', 'tomorrow', 'yesterday',
    'year', 'years', 'week', 'weeks', 'month', 'months', 'hour', 'hours', 'minute', 'minutes', 'moment', 'moments',
    'people', 'person', 'man', 'men', 'woman', 'women', 'child', 'children', 'guy', 'guys', 'dude', 'dudes',
    'place', 'places', 'part', 'parts', 'kind', 'kinds', 'sort', 'sorts', 'type', 'types',
    'life', 'world', 'house', 'home', 'school', 'work', 'job', 'money', 'car', 'food', 'water',
    'lot', 'lots', 'bit', 'bits', 'piece', 'pieces', 'point', 'points', 'case', 'cases',
    
    // Prepositions and conjunctions
    'about', 'above', 'across', 'after', 'against', 'along', 'among', 'around', 'before', 'behind', 'below',
    'beneath', 'beside', 'between', 'beyond', 'during', 'except', 'inside', 'into', 'near', 'outside', 'over',
    'since', 'through', 'throughout', 'toward', 'towards', 'under', 'until', 'upon', 'within', 'without',
    'than', 'then', 'when', 'where', 'while', 'why', 'how', 'what', 'which', 'who', 'whom', 'whose',
    
    // Contractions and common variations
    'dont', 'doesnt', 'didnt', 'wont', 'wouldnt', 'couldnt', 'shouldnt', 'cant', 'isnt', 'arent', 'wasnt', 'werent',
    'havent', 'hasnt', 'hadnt', 'isnt', 'arent', 'wasnt', 'werent', 'thats', 'thats', 'theres', 'heres', 'wheres',
    'whos', 'whats', 'hows', 'whys', 'whens', 'wheres',
    
    // Common filler words
    'yeah', 'yep', 'nope', 'ok', 'okay', 'yes', 'no', 'maybe', 'perhaps', 'probably', 'definitely',
    'um', 'uh', 'ah', 'oh', 'well', 'hmm', 'huh',
    
    // Social media specific
    'https', 'http', 'www', 'com', 'bsky', 'social', 'twitter', 'x', 'facebook', 'instagram',
    'bskysocial', // Common Bluesky domain reference
    
    // Numbers (as words)
    'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'first', 'second', 'third',
    
    // Common phrases that aren't meaningful
    'back', 'here', 'there', 'where', 'everywhere', 'nowhere', 'somewhere', 'anywhere',
    'up', 'down', 'out', 'off', 'away', 'back', 'forward', 'ahead', 'behind',
  ]);

  const wordCounts: Record<string, number> = {};
  const bigramCounts: Record<string, number> = {};

  posts.forEach((item: any) => {
    const text = (item.post.record?.text || "").toLowerCase();
    // Remove URLs, mentions, and hashtags
    const cleanText = text
      .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
      .replace(/@\w+/g, '') // Remove mentions
      .replace(/#\w+/g, '') // Remove hashtags
      .replace(/['"]/g, ' '); // Replace quotes with spaces
    
    const words = cleanText.split(/\s+/)
      .map((w: string) => w.replace(/[^a-z]/g, '')) // Remove non-letters
      .filter((w: string) => {
        // Filter out: empty, too short, stop words, and common patterns
        if (!w || w.length < 4) return false;
        if (stopWords.has(w)) return false;
        // Filter out words that are just numbers or common patterns
        if (/^\d+$/.test(w)) return false;
        // Filter out domain-like words (bskysocial, twitter, etc.)
        if (w.includes('social') || w.includes('twitter') || w.includes('facebook') || w.includes('instagram')) return false;
        // Filter out common domain patterns
        if (w.endsWith('com') || w.endsWith('net') || w.endsWith('org')) return false;
        if (w.length < 4) return false;
        return true;
      });

    // Count single words
    words.forEach((word: string) => {
      if (word.length >= 4 && !stopWords.has(word)) {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    });

    // Count bigrams (two-word phrases) - only if both words are meaningful
    for (let i = 0; i < words.length - 1; i++) {
      const word1 = words[i];
      const word2 = words[i + 1];
      if (word1 && word2 && 
          word1.length >= 4 && word2.length >= 4 && 
          !stopWords.has(word1) && !stopWords.has(word2)) {
        const bigram = `${word1} ${word2}`;
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

