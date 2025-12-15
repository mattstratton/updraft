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

function analyzePosterType(posts: any[], totalPosts: number, totalReplies: number, totalReposts: number, avgEngagement: number, longestStreak: number, hourCounts: Record<number, number>) {
  if (totalPosts === 0) {
    return {
      type: "Balanced",
      description: "Your posting style is balanced across all metrics.",
    };
  }

  // Count how many posts are replies vs reposts vs original
  const replyPosts = posts.filter((item: any) => item.post.record?.reply).length;
  const repostPosts = posts.filter((item: any) => item.post.record?.embed?.$type === 'app.bsky.embed.record').length;
  
  // Calculate ratios
  const replyRatio = replyPosts / totalPosts;
  const repostRatio = repostPosts / totalPosts;
  const originalPostRatio = 1 - replyRatio - repostRatio;

  // Calculate time patterns
  let nightOwlPosts = 0;
  let earlyBirdPosts = 0;
  let totalTimePosts = 0;

  Object.entries(hourCounts).forEach(([hour, count]) => {
    const h = parseInt(hour);
    totalTimePosts += count;
    // Night owl: 10 PM - 2 AM (22, 23, 0, 1)
    if (h >= 22 || h < 2) {
      nightOwlPosts += count;
    }
    // Early bird: 5 AM - 9 AM (5, 6, 7, 8)
    if (h >= 5 && h < 9) {
      earlyBirdPosts += count;
    }
  });

  const nightOwlRatio = totalTimePosts > 0 ? nightOwlPosts / totalTimePosts : 0;
  const earlyBirdRatio = totalTimePosts > 0 ? earlyBirdPosts / totalTimePosts : 0;

  // Determine poster type (check in priority order)
  
  // Streak Master
  if (longestStreak > 200) {
    return {
      type: "Streak Master",
      description: `${longestStreak} days in a row? That's not dedication, that's a cry for help. (We're impressed though.)`,
    };
  }

  // Quality Over Quantity
  if (totalPosts < 100 && avgEngagement > 30) {
    return {
      type: "Quality Over Quantity",
      description: "You post like you're rationing words during a shortage. And somehow, it works. Respect.",
    };
  }

  // Night Owl
  if (nightOwlRatio > 0.4) {
    return {
      type: "Night Owl",
      description: "You post when normal people sleep. Your 2 AM thoughts are either genius or unhinged. No in-between.",
    };
  }

  // Early Bird
  if (earlyBirdRatio > 0.4) {
    return {
      type: "Early Bird",
      description: "Posting at 6 AM? Who hurt you? (Or are you just that person who's annoyingly productive before coffee?)",
    };
  }

  // Conversationalist
  if (replyRatio > 0.4) {
    return {
      type: "Conversationalist",
      description: "You can't help yourself - you reply to everything. People's threads would die without you, and you know it.",
    };
  }

  // Curator
  if (repostRatio > 0.3) {
    return {
      type: "Curator",
      description: "You're basically a human algorithm. You find the good stuff and repost it. Original thoughts? Overrated.",
    };
  }

  // Thought Leader
  if (avgEngagement > 50 && totalPosts > 50) {
    return {
      type: "Thought Leader",
      description: "People actually read your posts. Wild concept. You've cracked the code of making people care.",
    };
  }

  // Creator
  if (originalPostRatio > 0.7 && replyRatio < 0.2) {
    return {
      type: "Creator",
      description: "You post original thoughts and ignore replies. Main character energy, and honestly? We're here for it.",
    };
  }

  // Power User
    if (totalPosts > 1000) {
      return {
        type: "Power User",
        description: `${totalPosts.toLocaleString()} posts? Touch grass. (But also, wow. That's a lot of thoughts.)`,
      };
    }

  // Default: Balanced
  return {
    type: "Balanced",
    description: "You're... fine. Not too much, not too little. Perfectly average. Congratulations?",
  };
}

function analyzeEmojis(posts: any[]): { topEmojis: { emoji: string; count: number }[]; totalEmojis: number } {
  const emojiCounts: Record<string, number> = {};
  let totalEmojis = 0;

  // Match emoji sequences: base emoji + optional modifiers (skin tone, zero-width joiner, variation selector)
  // This regex matches complete emoji sequences, not individual code points
  const emojiRegex = /\p{Emoji_Presentation}|\p{Emoji}\uFE0F?/gu;

  // Specific code points to exclude (these are symbols but not emojis)
  const excludedCodePoints = new Set([
    0x2640, // ♀ Female sign
    0x2642, // ♂ Male sign
    0x2648, 0x2649, 0x264A, 0x264B, 0x264C, 0x264D, 0x264E, 0x264F, // Zodiac signs
    0x2713, // ✓ Check mark
    0x2714, // ✔ Heavy check mark
    0x2715, // ✕ Multiplication X
    0x2716, // ✖ Heavy multiplication X
    0x2717, // ✗ Ballot X
    0x2718, // ✘ Heavy ballot X
  ]);

  posts.forEach((item: any) => {
    const text = item.post.record?.text || "";
    
    // Match emoji sequences
    let match;
    const regex = new RegExp(emojiRegex.source, emojiRegex.flags);
    while ((match = regex.exec(text)) !== null) {
      const emoji = match[0];
      
      // Skip if it's a single ASCII character
      if (emoji.length === 1 && emoji.charCodeAt(0) < 128) continue;
      
      // Check if the first code point is excluded
      const firstCodePoint = emoji.codePointAt(0);
      if (firstCodePoint && excludedCodePoints.has(firstCodePoint)) continue;
      
      // Only count if it's actually an emoji (has emoji presentation or is in emoji ranges)
      // This filters out things like digits, letters, and basic punctuation
      const codePoint = emoji.codePointAt(0);
      if (codePoint) {
        // Skip ASCII and basic Latin
        if (codePoint < 0x80) continue;
        
        // Skip if it's just a digit
        if (codePoint >= 0x30 && codePoint <= 0x39) continue;
        
        // Skip common arrows and symbols that aren't emojis
        if (codePoint >= 0x2190 && codePoint <= 0x21FF) {
          // But allow some emoji-like arrows
          if (![0x2194, 0x2195, 0x2196, 0x2197, 0x2198, 0x2199].includes(codePoint)) {
            continue;
          }
        }
      }
      
      emojiCounts[emoji] = (emojiCounts[emoji] || 0) + 1;
      totalEmojis++;
    }
  });

  const topEmojis = Object.entries(emojiCounts)
    .map(([emoji, count]) => ({ emoji, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return { topEmojis, totalEmojis };
}

function analyzeEngagementTimeline(posts: any[], timezoneOffsetMinutes: number = 0): { bestMonth: string; bestDay: string; bestHour: number; bestMonthAvg: number; bestDayAvg: number; bestHourAvg: number } {
  // Calculate engagement per month/day/hour
  const monthEngagement: Record<string, { total: number; count: number }> = {};
  const dayEngagement: Record<string, { total: number; count: number }> = {};
  const hourEngagement: Record<number, { total: number; count: number }> = {};

  posts.forEach((item: any) => {
    const local = getLocalTimeComponents(item.post.record?.createdAt, timezoneOffsetMinutes);
    const month = local.month;
    const day = local.day;
    const hour = local.hour;
    
    const engagement = (item.post.likeCount || 0) + (item.post.repostCount || 0) + (item.post.replyCount || 0);
    
    // Month
    if (!monthEngagement[month]) {
      monthEngagement[month] = { total: 0, count: 0 };
    }
    monthEngagement[month].total += engagement;
    monthEngagement[month].count += 1;
    
    // Day
    if (!dayEngagement[day]) {
      dayEngagement[day] = { total: 0, count: 0 };
    }
    dayEngagement[day].total += engagement;
    dayEngagement[day].count += 1;
    
    // Hour
    if (!hourEngagement[hour]) {
      hourEngagement[hour] = { total: 0, count: 0 };
    }
    hourEngagement[hour].total += engagement;
    hourEngagement[hour].count += 1;
  });

  // Find best performing periods
  let bestMonth = "Unknown";
  let bestMonthAvg = 0;
  let bestDay = "Unknown";
  let bestDayAvg = 0;
  let bestHour = 12;
  let bestHourAvg = 0;

  Object.entries(monthEngagement).forEach(([month, data]) => {
    const avg = data.count > 0 ? data.total / data.count : 0;
    if (avg > bestMonthAvg) {
      bestMonthAvg = avg;
      bestMonth = month;
    }
  });

  Object.entries(dayEngagement).forEach(([day, data]) => {
    const avg = data.count > 0 ? data.total / data.count : 0;
    if (avg > bestDayAvg) {
      bestDayAvg = avg;
      bestDay = day;
    }
  });

  Object.entries(hourEngagement).forEach(([hourStr, data]) => {
    const hour = parseInt(hourStr);
    const avg = data.count > 0 ? data.total / data.count : 0;
    if (avg > bestHourAvg) {
      bestHourAvg = avg;
      bestHour = hour;
    }
  });

  return {
    bestMonth,
    bestDay,
    bestHour,
    bestMonthAvg: Math.round(bestMonthAvg),
    bestDayAvg: Math.round(bestDayAvg),
    bestHourAvg: Math.round(bestHourAvg),
  };
}

function findMilestones(posts: any[], totalPosts: number): { milestones: { postNumber: number; text: string; likes: number; reposts: number; replies: number; uri: string; createdAt: string }[] } {
  const milestones: { postNumber: number; text: string; likes: number; reposts: number; replies: number; uri: string; createdAt: string }[] = [];
  
  // Sort posts chronologically (oldest first)
  const sortedPosts = [...posts].sort((a, b) => {
    const dateA = new Date(a.post.record?.createdAt || 0).getTime();
    const dateB = new Date(b.post.record?.createdAt || 0).getTime();
    return dateA - dateB;
  });

  // Define milestone thresholds
  const thresholds = [100, 500, 1000, 2500, 5000, 10000];
  
  thresholds.forEach((threshold) => {
    if (totalPosts >= threshold) {
      const postIndex = threshold - 1; // 0-indexed
      if (postIndex < sortedPosts.length) {
        const post = sortedPosts[postIndex];
        milestones.push({
          postNumber: threshold,
          text: post.post.record?.text || "",
          likes: post.post.likeCount || 0,
          reposts: post.post.repostCount || 0,
          replies: post.post.replyCount || 0,
          uri: post.post.uri,
          createdAt: post.post.record?.createdAt || "",
        });
      }
    }
  });

  // Also add the first post if we have it
  if (sortedPosts.length > 0) {
    const firstPost = sortedPosts[0];
    milestones.push({
      postNumber: 1,
      text: firstPost.post.record?.text || "",
      likes: firstPost.post.likeCount || 0,
      reposts: firstPost.post.repostCount || 0,
      replies: firstPost.post.replyCount || 0,
      uri: firstPost.post.uri,
      createdAt: firstPost.post.record?.createdAt || "",
    });
  }

  // Sort by post number
  milestones.sort((a, b) => a.postNumber - b.postNumber);

  return { milestones };
}

function analyzeLinks(posts: any[]): { topDomains: { domain: string; count: number }[]; totalLinks: number; type: string; description: string } {
  const domainCounts: Record<string, number> = {};
  let totalLinks = 0;

  // URL regex pattern - matches http/https URLs
  const urlRegex = /https?:\/\/(?:[-\w.])+(?::[0-9]+)?(?:\/(?:[\w\/_.])*)?(?:\?(?:[\w&=%.])*)?(?:#(?:[\w.])*)?/gi;

  posts.forEach((item: any) => {
    const text = item.post.record?.text || "";
    const matches = text.match(urlRegex);
    
    if (matches) {
      matches.forEach((url: string) => {
        try {
          const urlObj = new URL(url);
          const hostname = urlObj.hostname;
          
          // Remove www. prefix for cleaner display
          const domain = hostname.replace(/^www\./, '');
          
          // Skip common Bluesky/internal domains
          if (domain.includes('bsky.app') || domain.includes('bluesky')) {
            return;
          }
          
          domainCounts[domain] = (domainCounts[domain] || 0) + 1;
          totalLinks++;
        } catch (e) {
          // Invalid URL, skip
        }
      });
    }
  });

  const topDomains = Object.entries(domainCounts)
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Determine curator type based on link sharing patterns
  let type = "Text-only";
  let description = "You keep it simple. No links, no distractions. Pure thoughts.";

  if (totalLinks === 0 || topDomains.length === 0) {
    return { topDomains: [], totalLinks: 0, type, description };
  }

  // If we have domains, we should classify them properly
  const linkRatio = totalLinks / posts.length;
  
  if (linkRatio > 0.3) {
    type = "Link Curator";
    description = "You're a digital librarian. Constantly sharing the best of the web. Everyone's favorite link source.";
  } else if (linkRatio > 0.15) {
    type = "Selective Sharer";
    description = "You share links, but only the good stuff. Quality over quantity.";
  } else if (linkRatio > 0.05) {
    type = "Occasional Linker";
    description = "You share links when they matter. Not spam, just substance.";
  } else {
    // Even if ratio is low, if they have links, they're a link sharer
    type = "Link Sharer";
    description = "You share links, even if sparingly. Quality over quantity.";
  }

  return { topDomains, totalLinks, type, description };
}

function analyzeVisualizations(posts: any[], targetYear: number, timezoneOffsetMinutes: number = 0): { 
  monthlyPosts: { month: string; count: number }[];
  monthlyEngagement: { month: string; engagement: number }[];
  dailyActivity: { day: string; count: number }[];
} {
  // Group posts by month
  const monthlyPosts: Record<string, number> = {};
  const monthlyEngagement: Record<string, number> = {};
  const dailyActivity: Record<string, number> = {};

  // Month names in order
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  
  // Initialize all months to 0
  monthNames.forEach(month => {
    monthlyPosts[month] = 0;
    monthlyEngagement[month] = 0;
  });

  // Day names
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  dayNames.forEach(day => {
    dailyActivity[day] = 0;
  });

  posts.forEach((item: any) => {
    const local = getLocalTimeComponents(item.post.record?.createdAt, timezoneOffsetMinutes);
    const month = local.month;
    const day = local.day;
    
    const engagement = (item.post.likeCount || 0) + (item.post.repostCount || 0) + (item.post.replyCount || 0);
    
    monthlyPosts[month] = (monthlyPosts[month] || 0) + 1;
    monthlyEngagement[month] = (monthlyEngagement[month] || 0) + engagement;
    dailyActivity[day] = (dailyActivity[day] || 0) + 1;
  });

  // Convert to arrays, sorted by month order
  const monthlyPostsArray = monthNames
    .filter(month => monthlyPosts[month] > 0)
    .map(month => ({ month, count: monthlyPosts[month] }));

  const monthlyEngagementArray = monthNames
    .filter(month => monthlyEngagement[month] > 0)
    .map(month => ({ month, engagement: monthlyEngagement[month] }));

  // Sort days by week order (Sunday first)
  const dailyActivityArray = dayNames.map(day => ({ 
    day: day.substring(0, 3), // Abbreviate to 3 letters
    count: dailyActivity[day] || 0 
  }));

  return {
    monthlyPosts: monthlyPostsArray,
    monthlyEngagement: monthlyEngagementArray,
    dailyActivity: dailyActivityArray,
  };
}

function analyzeThreads(posts: any[]): {
  longestThread: { text: string; replies: number; likes: number; reposts: number; uri: string } | null;
  conversationStarters: { text: string; replies: number; likes: number; reposts: number; uri: string }[];
  totalThreadsStarted: number;
  avgRepliesPerThread: number;
  type: string;
  description: string;
} {
  // Find posts that started threads:
  // 1. Must be a top-level post (not a reply itself) - check if record.reply is undefined/null
  // 2. Must have replies (replyCount > 0)
  const threadStarters = posts.filter((item: any) => {
    const isTopLevelPost = !item.post.record?.reply; // Top-level posts don't have a reply field
    const replyCount = item.post.replyCount || 0;
    return isTopLevelPost && replyCount > 0;
  });

  const totalThreadsStarted = threadStarters.length;

  // Find the longest thread (most replies)
  let longestThread: any = null;
  let maxReplies = 0;

  threadStarters.forEach((item: any) => {
    const replies = item.post.replyCount || 0;
    if (replies > maxReplies) {
      maxReplies = replies;
      longestThread = item;
    }
  });

  // Get top conversation starters (posts with most replies)
  const conversationStarters = threadStarters
    .map((item: any) => ({
      text: item.post.record?.text || "",
      replies: item.post.replyCount || 0,
      likes: item.post.likeCount || 0,
      reposts: item.post.repostCount || 0,
      uri: item.post.uri,
    }))
    .sort((a, b) => b.replies - a.replies)
    .slice(0, 5);

  // Calculate average replies per thread
  const totalReplies = threadStarters.reduce((sum: number, item: any) => {
    return sum + (item.post.replyCount || 0);
  }, 0);
  const avgRepliesPerThread = totalThreadsStarted > 0 ? Math.round(totalReplies / totalThreadsStarted) : 0;

  // Determine conversation starter type
  let type = "Quiet Observer";
  let description = "You mostly observe. Not much of a conversation starter, but that's okay.";

  if (totalThreadsStarted === 0) {
    return {
      longestThread: null,
      conversationStarters: [],
      totalThreadsStarted: 0,
      avgRepliesPerThread: 0,
      type,
      description,
    };
  }

  const threadRatio = totalThreadsStarted / posts.length;
  const avgReplies = avgRepliesPerThread;

  if (threadRatio > 0.4 && avgReplies > 10) {
    type = "Conversation Master";
    description = "You're a conversation architect. Every post is a thread waiting to happen. People can't help but respond.";
  } else if (threadRatio > 0.3 && avgReplies > 5) {
    type = "Thread Starter";
    description = "You know how to get people talking. Your posts spark discussions.";
  } else if (threadRatio > 0.2) {
    type = "Occasional Conversationalist";
    description = "You start conversations when it matters. Quality over quantity.";
  } else if (avgReplies > 15) {
    type = "Selective Starter";
    description = "You don't post often, but when you do, people respond. That's the power of good content.";
  } else {
    type = "Quiet Starter";
    description = "You start threads, but they're more intimate. Small conversations, big connections.";
  }

  return {
    longestThread: longestThread ? {
      text: longestThread.post.record?.text || "",
      replies: longestThread.post.replyCount || 0,
      likes: longestThread.post.likeCount || 0,
      reposts: longestThread.post.repostCount || 0,
      uri: longestThread.post.uri,
    } : null,
    conversationStarters,
    totalThreadsStarted,
    avgRepliesPerThread,
    type,
    description,
  };
}

function analyzeMedia(posts: any[], totalPosts: number): { mediaPosts: number; mediaRatio: number; type: string; description: string } {
  let mediaPosts = 0;
  let imagePosts = 0;
  let videoPosts = 0;

  posts.forEach((item: any) => {
    const embed = item.post.record?.embed;
    if (embed) {
      if (embed.$type === 'app.bsky.embed.images') {
        mediaPosts++;
        imagePosts++;
      } else if (embed.$type === 'app.bsky.embed.video') {
        mediaPosts++;
        videoPosts++;
      }
    }
  });

  const mediaRatio = totalPosts > 0 ? mediaPosts / totalPosts : 0;

  let type = "Text-only";
  let description = "Words are your medium. No images, no videos, just pure text. Old school.";

  if (mediaRatio > 0.5) {
    if (imagePosts > videoPosts * 2) {
      type = "Visual Storyteller";
      description = "You speak in images. Every post is a picture worth a thousand words. Instagram who?";
    } else if (videoPosts > imagePosts) {
      type = "Video Creator";
      description = "You're all about that moving picture life. TikTok energy, Bluesky platform.";
    } else {
      type = "Multimedia Master";
      description = "Images, videos, text - you do it all. A true content creator.";
    }
  } else if (mediaRatio > 0.2) {
    type = "Balanced";
    description = "You mix it up. Sometimes words, sometimes visuals. Versatile.";
  }

  return { mediaPosts, mediaRatio, type, description };
}

function analyzePostingAge(posts: any[], totalPosts: number, totalReplies: number): { era: string; year: string; description: string } {
  if (totalPosts === 0) {
    return {
      era: "2024s Bluesky",
      year: "2024",
      description: "Your posting style matches modern Bluesky.",
    };
  }

  // Count how many posts are replies (have a reply.parent field)
  const replyPosts = posts.filter((item: any) => item.post.record?.reply).length;
  const replyRatio = replyPosts / totalPosts;

  // Calculate average post length
  let totalLength = 0;
  let postsWithText = 0;
  let hashtagCount = 0;
  let emojiCount = 0;

  posts.forEach((item: any) => {
    const text = item.post.record?.text || "";
    if (text.length > 0) {
      totalLength += text.length;
      postsWithText++;
      
      // Count hashtags
      const hashtags = text.match(/#\w+/g);
      if (hashtags) hashtagCount += hashtags.length;
      
      // Count emojis (basic emoji detection)
      const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
      const emojis = text.match(emojiRegex);
      if (emojis) emojiCount += emojis.length;
    }
  });

  const avgLength = postsWithText > 0 ? totalLength / postsWithText : 0;
  const avgHashtags = postsWithText > 0 ? hashtagCount / postsWithText : 0;
  const avgEmojis = postsWithText > 0 ? emojiCount / postsWithText : 0;

  // Calculate vintage score (higher = older style)
  // Factors:
  // - Longer posts = older (2010s Twitter was verbose)
  // - More hashtags = older (peak hashtag era was 2010-2015)
  // - Less emojis = older (emoji usage increased over time)
  // - More replies = newer (modern social media is more conversational)
  
  let vintageScore = 0;
  
  // Post length (0-40 points)
  if (avgLength > 200) vintageScore += 40;
  else if (avgLength > 150) vintageScore += 30;
  else if (avgLength > 100) vintageScore += 20;
  else if (avgLength > 50) vintageScore += 10;
  
  // Hashtag usage (0-30 points)
  if (avgHashtags > 3) vintageScore += 30;
  else if (avgHashtags > 2) vintageScore += 20;
  else if (avgHashtags > 1) vintageScore += 10;
  else if (avgHashtags > 0.5) vintageScore += 5;
  
  // Emoji usage (0-20 points, inverted - less emojis = older)
  if (avgEmojis < 0.1) vintageScore += 20;
  else if (avgEmojis < 0.5) vintageScore += 15;
  else if (avgEmojis < 1) vintageScore += 10;
  else if (avgEmojis < 2) vintageScore += 5;
  
  // Reply ratio (0-10 points, inverted - more replies = newer)
  if (replyRatio < 0.1) vintageScore += 10;
  else if (replyRatio < 0.2) vintageScore += 7;
  else if (replyRatio < 0.3) vintageScore += 4;

  // Map score to era
  if (vintageScore >= 70) {
    return {
      era: "2010s Twitter",
      year: "2010",
      description: "You still write like hashtags are a personality trait and emojis haven't been invented yet. Peak 2010 energy.",
    };
  } else if (vintageScore >= 50) {
    return {
      era: "2015s Twitter",
      year: "2015",
      description: "You're stuck in the golden age of Twitter—when hashtags were cool and we still had character limits. Classic.",
    };
  } else if (vintageScore >= 30) {
    return {
      era: "2020s Twitter",
      year: "2020",
      description: "You've evolved past hashtag spam but haven't fully embraced the emoji revolution. A transitional era.",
    };
  } else {
    return {
      era: "2024s Bluesky",
      year: "2024",
      description: "You post like you were born on Bluesky yesterday. Short, emoji-heavy, and terminally online. Welcome to the future.",
    };
  }
}

// Helper function to get local time components from a UTC timestamp
// timezoneOffsetMinutes: offset from UTC in minutes (e.g., EST = -300, PST = -480)
// Note: JavaScript's getTimezoneOffset() returns POSITIVE for timezones BEHIND UTC
// So EST (UTC-5) returns +300, and we negate it to get -300
// This function returns an object with local time components
function getLocalTimeComponents(utcTimestamp: string, timezoneOffsetMinutes: number): {
  date: Date;
  month: string;
  day: string;
  hour: number;
  dateStr: string;
} {
  // Parse the UTC timestamp - JavaScript Date parses ISO strings as UTC
  const utcDate = new Date(utcTimestamp);
  
  // Get UTC components
  const utcYear = utcDate.getUTCFullYear();
  const utcMonth = utcDate.getUTCMonth();
  const utcDateNum = utcDate.getUTCDate();
  const utcHours = utcDate.getUTCHours();
  const utcMinutes = utcDate.getUTCMinutes();
  const utcSeconds = utcDate.getUTCSeconds();
  
  // Convert UTC to user's local time by adding offset
  // timezoneOffsetMinutes is already negated from getTimezoneOffset (e.g., EST = -300)
  const totalMinutes = utcMinutes + timezoneOffsetMinutes;
  const localHours = (utcHours + Math.floor(totalMinutes / 60) + 24) % 24;
  const localMinutes = (totalMinutes % 60 + 60) % 60;
  
  // Calculate date adjustments for day/month/year boundaries
  let localYear = utcYear;
  let localMonth = utcMonth;
  let localDateNum = utcDateNum;
  
  // Handle day rollover
  const hoursDiff = Math.floor((utcMinutes + timezoneOffsetMinutes) / 60);
  const adjustedHours = utcHours + hoursDiff;
  
  if (adjustedHours < 0) {
    // Previous day
    localDateNum--;
    if (localDateNum < 1) {
      localMonth--;
      if (localMonth < 0) {
        localMonth = 11;
        localYear--;
      }
      // Get days in previous month
      const daysInPrevMonth = new Date(localYear, localMonth + 1, 0).getDate();
      localDateNum = daysInPrevMonth;
    }
  } else if (adjustedHours >= 24) {
    // Next day
    localDateNum++;
    const daysInMonth = new Date(localYear, localMonth + 1, 0).getDate();
    if (localDateNum > daysInMonth) {
      localDateNum = 1;
      localMonth++;
      if (localMonth > 11) {
        localMonth = 0;
        localYear++;
      }
    }
  }
  
  // Create a Date object in UTC that represents the local time
  // We'll use this for formatting, but extract components manually
  const localDate = new Date(Date.UTC(localYear, localMonth, localDateNum, localHours, localMinutes, utcSeconds));
  
  // Format month and day names
  const month = localDate.toLocaleString('default', { month: 'long', timeZone: 'UTC' });
  const day = localDate.toLocaleString('default', { weekday: 'long', timeZone: 'UTC' });
  
  // Format date string (YYYY-MM-DD)
  const dateStr = `${localYear}-${String(localMonth + 1).padStart(2, '0')}-${String(localDateNum).padStart(2, '0')}`;
  
  return {
    date: localDate,
    month,
    day,
    hour: localHours,
    dateStr,
  };
}

async function analyzeRecap(session: BlueskySession, posts: any[], profile: any, targetYear: number, fetchedIterations?: number, maxIterations?: number, timezoneOffsetMinutes: number = 0) {
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
    const local = getLocalTimeComponents(item.post.record?.createdAt, timezoneOffsetMinutes);
    const month = local.month;
    const day = local.day;
    const hour = local.hour;
    const dateStr = local.dateStr;
    
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

  // Analyze poster type
  console.log("Analyzing poster type...");
  const posterType = analyzePosterType(ownPosts, totalPosts, totalReplies, totalReposts, avgEngagement, longestStreak, hourCounts);

  // Analyze posting age
  console.log("Analyzing posting age...");
  const postingAge = analyzePostingAge(ownPosts, totalPosts, totalReplies);

  // Find first post of the year
  const firstPost = ownPosts.length > 0 
    ? ownPosts.reduce((earliest: any, post: any) => {
        const earliestDate = new Date(earliest.post.record?.createdAt);
        const postDate = new Date(post.post.record?.createdAt);
        return postDate < earliestDate ? post : earliest;
      })
    : null;

  // Find separate top posts by engagement type
  let mostLikedPost = ownPosts[0];
  let mostRepostedPost = ownPosts[0];
  let mostRepliedPost = ownPosts[0];
  let maxLikes = 0;
  let maxReposts = 0;
  let maxReplies = 0;

  ownPosts.forEach((item: any) => {
    const likes = item.post.likeCount || 0;
    const reposts = item.post.repostCount || 0;
    const replies = item.post.replyCount || 0;
    
    if (likes > maxLikes) {
      maxLikes = likes;
      mostLikedPost = item;
    }
    if (reposts > maxReposts) {
      maxReposts = reposts;
      mostRepostedPost = item;
    }
    if (replies > maxReplies) {
      maxReplies = replies;
      mostRepliedPost = item;
    }
  });

  // Analyze emojis
  console.log("Analyzing emojis...");
  const emojiAnalysis = analyzeEmojis(ownPosts);

  // Analyze media usage
  console.log("Analyzing media...");
  const mediaAnalysis = analyzeMedia(ownPosts, totalPosts);

  // Analyze engagement timeline
  console.log("Analyzing engagement timeline...");
  const engagementTimeline = analyzeEngagementTimeline(ownPosts);

  // Find milestone moments
  console.log("Finding milestone moments...");
  const milestones = findMilestones(ownPosts, totalPosts);

  // Analyze link/domain sharing
  console.log("Analyzing link/domain sharing...");
  const linkAnalysis = analyzeLinks(ownPosts);

  // Analyze posting frequency and engagement trends for visualizations
  console.log("Analyzing posting frequency and engagement trends...");
  const visualizations = analyzeVisualizations(ownPosts, targetYear, timezoneOffsetMinutes);

  // Analyze threads and conversation starters
  console.log("Analyzing threads...");
  const threadAnalysis = analyzeThreads(ownPosts);

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
    posterType,
    postingAge,
    firstPost: firstPost ? {
      text: firstPost.post.record?.text || "",
      likes: firstPost.post.likeCount || 0,
      reposts: firstPost.post.repostCount || 0,
      replies: firstPost.post.replyCount || 0,
      uri: firstPost.post.uri,
      createdAt: firstPost.post.record?.createdAt,
    } : null,
    mostLikedPost: mostLikedPost ? {
      text: mostLikedPost.post.record?.text || "",
      likes: mostLikedPost.post.likeCount || 0,
      reposts: mostLikedPost.post.repostCount || 0,
      replies: mostLikedPost.post.replyCount || 0,
      uri: mostLikedPost.post.uri,
    } : null,
    mostRepostedPost: mostRepostedPost ? {
      text: mostRepostedPost.post.record?.text || "",
      likes: mostRepostedPost.post.likeCount || 0,
      reposts: mostRepostedPost.post.repostCount || 0,
      replies: mostRepostedPost.post.replyCount || 0,
      uri: mostRepostedPost.post.uri,
    } : null,
    mostRepliedPost: mostRepliedPost ? {
      text: mostRepliedPost.post.record?.text || "",
      likes: mostRepliedPost.post.likeCount || 0,
      reposts: mostRepliedPost.post.repostCount || 0,
      replies: mostRepliedPost.post.replyCount || 0,
      uri: mostRepliedPost.post.uri,
    } : null,
    emojis: emojiAnalysis,
    media: mediaAnalysis,
    engagementTimeline: engagementTimeline,
    milestones: milestones,
    links: linkAnalysis,
    visualizations: visualizations,
    threads: threadAnalysis,
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
export async function generateRecap(handle: string, timezoneOffsetMinutes: number = 0) {
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

