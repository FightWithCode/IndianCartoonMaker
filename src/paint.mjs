import { env, key, label } from './settings.mjs';
import { storeMedia } from './media.mjs';

export async function paintScene(story, name) {
  if (!process.env.OPENAI_API_KEY || !env.imageModel) {
    throw new Error('Set OPENAI_API_KEY and OPENAI_IMAGE_MODEL in .env and restart the studio to paint a location.');
  }
  const scene = story.scenes.find(scene => key(scene.name) === key(name));
  if (!scene) throw new Error('Choose a location from this storyboard.');
  const brief = label(scene.artDirection, '', 1600);
  if (!brief) throw new Error(`Add an artDirection to the "${scene.name}" scene in the storyboard first.`);
  let response;
  try {
    response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: env.imageModel,
        size: '1536x1024',
        output_format: 'jpeg',
        output_compression: 91,
        quality: 'high',
        n: 1,
        prompt: `Paint one original rural Indian 2D animated film background plate for a location called "${scene.name}".
Use a wide eye-level camera, textured gouache, atmospheric depth, and readable forms. Keep the center of the lower half clear for the characters and for a 9:16 crop. No people, no characters, no logos, no lettering. The result will be cropped to 16:9 and graded for the time of day in the renderer. Scene type: ${scene.kind}. Art direction: ${brief}`,
      }),
      signal: AbortSignal.timeout(240000),
    });
  } catch (error) {
    throw new Error(`Could not reach the OpenAI image service. ${error.cause?.code || error.message}`);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Image generation returned HTTP ${response.status}: ${label(data.error?.message, 'Check the image model and account access.', 350)}`);
  if (!data.data?.[0]?.b64_json) throw new Error('The image model did not return JPEG data.');
  const image = await storeMedia(`${scene.name}.jpg`, Buffer.from(data.data[0].b64_json, 'base64'));
  return { image, scene: scene.name };
}
