import type { Story } from "../types";
import { adfToPlainText } from "./adf";

export class JiraAuthError extends Error {
  constructor(message = "Jira authentication failed") {
    super(message);
    this.name = "JiraAuthError";
  }
}

export class JiraNotFoundError extends Error {
  constructor(message = "Jira issue not found") {
    super(message);
    this.name = "JiraNotFoundError";
  }
}

type JiraIssueResponse = {
  key: string;
  fields: {
    summary: string;
    description?: unknown;
    status?: { name: string };
    issuetype?: { name: string };
    labels?: string[];
  };
};

const ISSUE_KEY_PATTERN = /([A-Z][A-Z0-9]+-\d+)/;
const REQUEST_TIMEOUT_MS = 20_000;

export function parseIssueKey(issueKeyOrUrl: string): string {
  const match = issueKeyOrUrl.match(ISSUE_KEY_PATTERN);
  if (!match) {
    throw new Error("Invalid Jira issue key or URL");
  }
  return match[1];
}

function normalizeSite(site: string): string {
  return site.replace(/\/+$/, "");
}

export async function fetchJiraIssue(input: {
  site: string;
  email: string;
  token: string;
  issueKeyOrUrl: string;
}): Promise<Story> {
  const key = parseIssueKey(input.issueKeyOrUrl);
  const site = normalizeSite(input.site);
  const auth = Buffer.from(`${input.email}:${input.token}`).toString("base64");
  const url = `${site}/rest/api/3/issue/${key}?fields=summary,description,status,issuetype,labels`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error("Jira request timed out");
    }
    throw error;
  }

  if (response.status === 401) {
    throw new JiraAuthError();
  }

  if (response.status === 404) {
    throw new JiraNotFoundError();
  }

  if (!response.ok) {
    throw new Error(`Jira request failed with status ${response.status}`);
  }

  const data = (await response.json()) as JiraIssueResponse;
  const description =
    data.fields.description == null
      ? ""
      : adfToPlainText(data.fields.description);

  return {
    jiraKey: data.key,
    jiraUrl: `${site}/browse/${data.key}`,
    title: data.fields.summary,
    description,
    labels: data.fields.labels ?? [],
    issueType: data.fields.issuetype?.name,
    status: data.fields.status?.name,
  };
}
