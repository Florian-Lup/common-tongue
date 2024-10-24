import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const apiUrl = process.env.Grammar_WORDWARE_API_URL;
  const apiKey = process.env.Grammar_WORDWARE_API_KEY;

  if (!apiUrl) {
    return res
      .status(500)
      .json({ error: 'WORDWARE_API_URL is not defined in environment variables.' });
  }

  if (!apiKey) {
    return res
      .status(500)
      .json({ error: 'WORDWARE_API_KEY is not defined in environment variables.' });
  }

  try {
    const { manuscript } = req.body.inputs;

    if (!manuscript) {
      return res.status(400).json({ message: 'Missing manuscript field' });
    }

    const requestBody = {
      inputs: { manuscript },
      version: '^1.2', // Ensure the correct version is used
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Invalid response from Wordware API: ${response.statusText} - ${errorText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    let done = false;
    let buffer = '';
    let finalRevision = '';
    let proofreaderAgentActive = false;
    let finalRevisionStarted = false;

    while (!done && reader) {
      const { done: readerDone, value } = await reader.read();
      done = readerDone;
      const chunk = decoder.decode(value, { stream: !readerDone });
      buffer += chunk;

      // Use a regex to extract complete JSON objects
      const regex = /(\{[^]*?\})(?=\s*\{|\s*$)/g;
      let match;
      let lastProcessedIndex = 0; // Track the end of the last processed match

      while ((match = regex.exec(buffer)) !== null) {
        const jsonString = match[1];
        const matchEndIndex = regex.lastIndex; // End index of the current match
        try {
          const parsedChunk = JSON.parse(jsonString);

          // Handle the parsing logic based on the content
          if (parsedChunk.value) {
            // Check if we're entering the Proofreader Agent
            if (
              parsedChunk.value.type === 'prompt' &&
              parsedChunk.value.state === 'start' &&
              parsedChunk.value.path === 'Proofreader Agent'
            ) {
              proofreaderAgentActive = true;
            }

            // Check if we're exiting the Proofreader Agent
            else if (
              parsedChunk.value.type === 'prompt' &&
              parsedChunk.value.state === 'complete' &&
              parsedChunk.value.path === 'Proofreader Agent'
            ) {
              proofreaderAgentActive = false;
            }

            // Start of finalRevision within the Proofreader Agent
            else if (
              proofreaderAgentActive &&
              parsedChunk.value.label === 'finalRevision' &&
              parsedChunk.value.state === 'start'
            ) {
              finalRevisionStarted = true;
            }

            // End of finalRevision within the Proofreader Agent
            else if (
              proofreaderAgentActive &&
              parsedChunk.value.label === 'finalRevision' &&
              parsedChunk.value.state === 'done'
            ) {
              finalRevisionStarted = false;
            }

            // Accumulate finalRevision text
            else if (
              proofreaderAgentActive &&
              finalRevisionStarted &&
              parsedChunk.value.type === 'chunk' &&
              parsedChunk.value.value
            ) {
              // Append only the new chunk to finalRevision
              finalRevision += parsedChunk.value.value;
            }
          }
        } catch (error) {
          console.error('Skipping invalid JSON chunk:', jsonString);
        }
        // Update lastProcessedIndex to the end of the current match
        lastProcessedIndex = matchEndIndex;
      }

      // Remove processed data from the buffer
      buffer = buffer.slice(lastProcessedIndex);
    }

    if (finalRevision) {
      return res.status(200).json({ finalRevision: finalRevision.trim() });
    } else {
      console.error('Full response buffer:', buffer);
      return res.status(500).json({
        error: 'finalRevision from Proofreader Agent not found in response',
        details: buffer, // Send raw response for debugging
      });
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error in fixGrammar API:', error);
      res.status(500).json({ error: 'Internal Server Error', details: error.message });
    } else {
      console.error('Unknown error in fixGrammar API:', error);
      res.status(500).json({ error: 'Unknown error occurred' });
    }
  }
}
