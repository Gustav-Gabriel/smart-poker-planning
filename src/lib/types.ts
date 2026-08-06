export type DeckType = "fibonacci" | "tshirt";

export type Player = {
  id: string;
  name: string;
  avatar: { type: "emoji" | "gif"; value: string };
  isHost: boolean;
  connected: boolean;
  vote: string | null;
};

export type RepoAttachment = {
  provider: "github" | "bitbucket";
  url: string;
  owner: string;
  repo: string;
  ref: string;
  selectedPaths: string[];
};

export type Story = {
  jiraKey: string;
  jiraUrl: string;
  title: string;
  description: string;
  labels: string[];
  issueType?: string;
  status?: string;
};

export type OmittedRepoFiles = {
  repository: string;
  paths: string[];
};

export type AiSuggestion = {
  kind: "summary" | "deep";
  createdAt: number;
  payload: {
    consensusNote: string;
    discussionPoints: string[];
    risks?: string[];
    unplannedWork?: string[];
    relevantFiles?: { path: string; reason: string }[];
    openQuestions?: string[];
    estimateTension?: string;
  };
  /** Repository file paths dropped for exceeding the context caps (deep analysis only). */
  omitted?: OmittedRepoFiles[];
};

export type RoomState = {
  code: string;
  name: string;
  deck: DeckType;
  hostId: string;
  players: Map<string, Player>;
  playerTokens: Map<string, string>;
  story: Story | null;
  repos: RepoAttachment[];
  revealed: boolean;
  suggestions: AiSuggestion[];
  lastActivityAt: number;
};

export type AiProvider = "openai" | "gemini" | "claude";

export type RoomSecrets = {
  hostToken: string;
  aiProvider: AiProvider;
  aiApiKey: string;
  jiraSite: string;
  jiraEmail: string;
  jiraToken: string;
  gitToken?: string;
};

export type ClientPlayer = Omit<Player, never> & { hasVoted: boolean };

export type ClientRoomSnapshot = {
  code: string;
  name: string;
  deck: DeckType;
  hostId: string;
  players: Array<{
    id: string;
    name: string;
    avatar: Player["avatar"];
    isHost: boolean;
    connected: boolean;
    hasVoted: boolean;
    vote: string | null;
  }>;
  story: Story | null;
  repos: RepoAttachment[];
  revealed: boolean;
  suggestions: AiSuggestion[];
  deckCards: string[];
};
