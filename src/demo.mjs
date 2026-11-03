// Deterministic fake stats so anyone can preview the card without real data.
export function demoStats(year = new Date().getFullYear()) {
  return {
    year,
    totals: { prompts: 3842, sessions: 276, activeDays: 141, hoursWithClaude: 312, tokens: 1840000000, outputTokens: 9400000, inputTokens: 2100000, cacheTokens: 1828500000, toolCalls: 28410, filesEdited: 1204, projects: 17 },
    manners: { please: 412, thanks: 187, sorry: 9, swears: 23, caps: 64, questions: 1530, interrupts: 88, nightPrompts: 410, bugPrompts: 903 },
    rhythm: { hours: [30,22,18,10,4,2,3,8,40,120,210,260,230,190,240,280,300,260,180,160,190,210,150,80], weekdays: [180,720,780,810,760,640,310], peakHour: 16, busiestDay: { date: `${year}-03-14`, prompts: 96 }, longestStreak: 23 },
    topTools: [['Bash', 9120], ['Read', 7410], ['Edit', 5230], ['Grep', 3100], ['Write', 1210]],
    topModels: [['claude-sonnet-5-5', 15200], ['claude-opus-5-5', 4100]],
    topProjects: [['autoesta', 1800], ['claude-wrapped', 640], ['dashboard', 410], ['api', 300], ['docs', 220]],
    topWords: [['page', 410], ['build', 380], ['content', 300], ['seo', 240], ['test', 210], ['schema', 180], ['fix', 170], ['deploy', 120]],
    topFile: { name: 'pages/index.astro', edits: 142 },
    longestSession: { hours: 5.8, prompts: 74 },
    longestPrompt: { chars: 4210, preview: 'Here is the full brief for the new pricing page. Start with the audience, then the three plans, then...' },
    avgPromptChars: 212,
    shortPrompts: 640,
  };
}
