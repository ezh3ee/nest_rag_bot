import { ChunkerService } from '../core/ingest/chunker.service';

const SAMPLE = [
  '# Product Overview',
  '',
  'Our platform is a multi-tenant SaaS solution for small businesses.',
  'It supports onboarding via Telegram bots and a web widget.',
  '',
  '## Pricing',
  '',
  'The basic plan costs 10 dollars per month. It includes one bot and up to 100 documents.',
  'The pro plan costs 50 dollars per month and adds unlimited documents plus priority support.',
  '',
  '## Support',
  '',
  'Support is available via email from 9 am to 6 pm. Enterprise clients get 24/7 phone support.',
].join('\n');

function main(): void {
  const chunker = new ChunkerService();
  const chunks = chunker.chunk(SAMPLE);
  console.log(`Chunks: ${chunks.length}`);
  for (const chunk of chunks) {
    console.log(`--- chunk ${chunk.index} (${chunk.text.length} chars) ---`);
    console.log(chunk.text.replace(/\n/g, '\\n'));
  }
  if (chunks.some((c) => c.text.length > 600)) {
    throw new Error('Chunk exceeds expected max size');
  }
  if (chunks.length < 1) {
    throw new Error('No chunks produced');
  }
  console.log('CHUNKER TEST PASSED');
}

main();
