import { Attachment } from 'mailparser';

const LATEST_EMAIL_ENDPOINT = 'https://mail-monster-api.create-flow.ai/api/latest?';

/**
 * Parameters for fetching the latest emails via Mail Monster API.
 *
 * @property api_key - (Required) The API key used for authentication.
 * @property email - (Optional) Only return messages for this recipient email address.
 * @property subject - (Optional) Case-insensitive substring to search for in the subject.
 * @property keyword - (Optional) Case-insensitive string to match anywhere in subject, sender, content, or attachments.
 * @property count - (Optional) Maximum number of email messages to return. Defaults to a small value if not specified.
 */
export interface IGetLatestEmailParams {
  api_key: string;
  email?: string;
  subject?: string;
  keyword?: string;
  count?: number;
}

export interface IGetLatestEmailCore {
  id: string;
  email_from: string;
  email_recipients?: string;
  email_subject?: string;
  content?: string;
}

export interface IGetLatestEmailRaw {
  attachments?: string;
}

export interface IGetLatestEmail extends IGetLatestEmailCore {
  attachments: Attachment[];
}

export async function getLatestEmails(params: IGetLatestEmailParams): Promise<IGetLatestEmail[]> {
  const url = new URL(LATEST_EMAIL_ENDPOINT);
  url.searchParams.append('apikey', params.api_key);
  if (params.email) { url.searchParams.append('email', params.email); }
  if (params.subject) { url.searchParams.append('title', params.subject); }
  if (params.keyword) { url.searchParams.append('keyword', params.keyword); }
  if (params.count !== undefined) { url.searchParams.append('count', String(params.count)); }
  const fetchEndpoint = url.toString();
  const response = await fetch(fetchEndpoint);
  if (!response.ok) {
    throw new Error(`Failed to fetch email: ${response.status} ${response.statusText}`);
  }
  const emails = await response.json() as IGetLatestEmailRaw[];
  return emails.map((em) => {
    const attachments = em.attachments ? parseAttachmentArray(em.attachments) : [];
    return {
      ...em,
      attachments,
    } as IGetLatestEmail;
  });
}

function parseAttachmentArray(stringified: string) {
  const unescaped = unescapeString(stringified);
  return parseComplexJsonString(unescaped) as Attachment[];
}

function unescapeString(escaped: string) {
    return escaped.replace(/\\(["'\\bfnrt]|u[0-9a-fA-F]{4})/g, (match: any) => {
        if (match.startsWith('\\u')) {
            return String.fromCharCode(parseInt(match.slice(2), 16));
        }
        switch (match[1]) {
            case '"': return '"';
            case "'": return "'";
            case '\\': return '\\';
            case 'b': return '\b';
            case 'f': return '\f';
            case 'n': return '\n';
            case 'r': return '\r';
            case 't': return '\t';
            default: return match;
        }
    });
}

function parseComplexJsonString(inputStr: string) {
  // 1. Sanitize: Remove the outer curly braces or brackets if present
  let cleanStr = inputStr.trim();
  if (cleanStr.startsWith('{') && cleanStr.endsWith('}')) {
    cleanStr = cleanStr.substring(1, cleanStr.length - 1);
  }

  const results = [];
  let buffer = '';       // Accumulates the current JSON object string
  let depth = 0;         // Tracks nested curly braces { }
  let inString = false;  // Tracks if we are inside a double-quoted string "..."
  let isEscaped = false; // Tracks if the current character is escaped \
  let parsingObject = false; // Are we currently building an object?

  for (const char of cleanStr) {

    // --- State Management ---

    // Handle Escapes (e.g., \" inside a string)
    if (isEscaped) {
      if (parsingObject) { buffer += char; }
      isEscaped = false;
      continue;
    }

    if (char === '\\') {
      if (parsingObject) { buffer += char; }
      isEscaped = true;
      continue;
    }

    // Handle String Boundaries (Quotes)
    if (char === '"') {
      // If we are parsing an object, this quote is part of the JSON
      if (parsingObject) {
        inString = !inString; // Toggle string state
        buffer += char;
      } else {
        // If we are NOT parsing, this quote is the wrapper around the object.
        // We ignore it and prepare to read the object in the next chars.
      }
      continue;
    }

    // --- JSON Structure Tracking ---

    // Only track braces if we are NOT inside a string value (e.g. "Values { inside }" shouldn't count)
    if (!inString) {
      if (char === '{') {
        if (depth === 0) {
          parsingObject = true; // Start of a new object
        }
        depth++;
      } else if (char === '}') {
        depth--;
      }
    }

    // --- Accumulation ---

    if (parsingObject) {
      buffer += char;

      // Check if this character closed the object
      if (depth === 0 && !inString) {
        // We found a complete JSON string: { ... }
        try {
          const parsedObj = JSON.parse(buffer);
          results.push(parsedObj);
        } catch (e) {
          console.error('Failed to parse extracted JSON chunk:', buffer);
        }
        // Reset for next object
        buffer = '';
        parsingObject = false;
      }
    }
  }

  return results;
}
