// Suggested blocklist. Curated from a large public profanity list — kept to
// the words most communities want filtered (slurs, sexual content, drugs,
// violence) while skipping completely benign words. Managers can pick from
// this list in space settings; the default new-space list is much shorter
// and only contains the very worst slurs.
export const SUGGESTED_BLOCKED_WORDS: string[] = [
  // racial / ethnic slurs
  "nigger","nigga","niggas","niggers","niggah","niggaz","n1gger","n1gga","ni99er","ni99a",
  "chink","chinky","gook","spic","wetback","kike","beaner","cracker","coon",
  "raghead","sandnigger","towelhead","cameljockey","redskin","wop","dago","jap","kraut",
  // homophobic / transphobic slurs
  "faggot","fag","faggit","faggy","dyke","bulldyke","bulldike","tranny","queer",
  // ableist slurs
  "retard","retarded","tard","spaz","mongoloid","cripple",
  // strong profanity
  "fuck","fucker","fucking","motherfucker","fucked","fck","mf","wtf","stfu",
  "shit","shitty","bullshit","bitch","bitches","bitchy","biatch","bastard",
  "asshole","ass","arse","arsehole","asswipe","assfuck","jackass",
  "damn","goddamn","crap","douche","douchebag","prick","wanker","tosser","twat",
  // sexual
  "cunt","pussy","cock","cocksucker","dick","dickhead","penis","vagina","anal",
  "anus","clit","clitoris","boob","boobs","boobies","tits","titties","nipple",
  "blowjob","bj","handjob","rimjob","jerkoff","jackoff","wank","masturbate",
  "porn","porno","xxx","horny","milf","gilf","slut","whore","hoe","skank","thot",
  "orgasm","cum","cumshot","jizz","semen","sperm","ejaculate","69","threesome",
  "bondage","bdsm","fetish","fisting","incest","pedo","pedophile","molest","rape","rapist",
  // body / gross
  "shithole","shitface","shitbag","piss","pissed","pissoff",
  // violence / self-harm
  "kill","kys","kysstring","murder","suicide","killyourself","killmyself","hangyourself",
  "shoot","shooting","stab","stabbing","bomb","bombs","bomber","terrorist","terrorism",
  // drugs
  "cocaine","coke","heroin","meth","methamphetamine","crack","crackhead","junkie","junky",
  "weed","marijuana","pot","stoner","blunt","bong","ganja","hash","hashish",
  "lsd","acid","shrooms","mdma","ecstasy","molly","ketamine","pcp","xanax","oxy","oxycontin",
  // gambling
  "casino","gamble","gambling",
  // misc abusive
  "stupid","idiot","moron","dumbass","dumbo","loser","scumbag","lowlife","trash","garbage",
  "shutup","shut_up","hate","ihateyou","ihatethis",
];