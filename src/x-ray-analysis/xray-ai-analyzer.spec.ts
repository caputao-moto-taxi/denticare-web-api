import { ConfigService } from '@nestjs/config';
import { XRayAiAnalyzer } from './xray-ai-analyzer';

describe('XRayAiAnalyzer', () => {
  afterEach(() => jest.restoreAllMocks());

  it('does not send an image when the private endpoint is not configured', async () => {
    const analyzer = new XRayAiAnalyzer(new ConfigService({}));
    const fetch = jest.spyOn(global, 'fetch');

    await expect(
      analyzer.analyze(Buffer.from('image'), 'image/png', 'periapical', '26'),
    ).rejects.toThrow('X-ray AI is not configured');

    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns a validated decision-support result from the configured endpoint', async () => {
    const analyzer = new XRayAiAnalyzer(
      new ConfigService({
        XRAY_AI_BASE_URL: 'http://private-ai.test/v1',
        XRAY_AI_MODEL: 'dental-vision',
        XRAY_AI_API_KEY: 'test-key',
      }),
    );
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  summary: 'Image quality is adequate.',
                  observations: [
                    {
                      description: 'A radiolucent appearance is visible.',
                      location: 'Tooth 26',
                      confidence: 'moderate',
                    },
                  ],
                  imageQuality: { rating: 'adequate', issues: [] },
                  requiresProfessionalReview: true,
                }),
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const analysis = await analyzer.analyze(
      Buffer.from('image'),
      'image/png',
      'periapical',
      '26',
    );

    expect(analysis.modelName).toBe('dental-vision');
    expect(analysis.result.observations).toHaveLength(1);
    expect(analysis.result.requiresProfessionalReview).toBe(true);
  });

  it('formats image input for the Ollama OpenAI-compatible endpoint', async () => {
    const analyzer = new XRayAiAnalyzer(
      new ConfigService({
        XRAY_AI_BASE_URL: 'http://localhost:11434/v1',
        XRAY_AI_MODEL: 'qwen3-vl:8b',
        XRAY_AI_PROVIDER: 'ollama',
      }),
    );
    const fetch = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  summary: 'Image quality is adequate.',
                  observations: [],
                  imageQuality: { rating: 'adequate', issues: [] },
                  requiresProfessionalReview: true,
                }),
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    await analyzer.analyze(
      Buffer.from('image'),
      'image/png',
      'periapical',
      '26',
    );

    const request = JSON.parse(String(fetch.mock.calls[0][1]?.body)) as {
      messages: { content: { image_url: unknown }[] }[];
    };
    expect(request.messages[0].content[1].image_url).toBe(
      `data:image/png;base64,${Buffer.from('image').toString('base64')}`,
    );
  });

  it('rejects responses that omit professional review', async () => {
    const analyzer = new XRayAiAnalyzer(
      new ConfigService({
        XRAY_AI_BASE_URL: 'http://private-ai.test/v1',
        XRAY_AI_MODEL: 'dental-vision',
      }),
    );
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  summary: 'Image quality is adequate.',
                  observations: [],
                  imageQuality: { rating: 'adequate', issues: [] },
                  requiresProfessionalReview: false,
                }),
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    await expect(
      analyzer.analyze(Buffer.from('image'), 'image/png', 'periapical', '26'),
    ).rejects.toThrow('X-ray AI returned an invalid analysis shape');
  });
});
