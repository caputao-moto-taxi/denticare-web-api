import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type XRayAnalysisResult = {
  summary: string;
  observations: {
    description: string;
    location: string;
    confidence: 'low' | 'moderate' | 'high';
  }[];
  imageQuality: {
    rating: 'adequate' | 'limited' | 'unusable';
    issues: string[];
  };
  requiresProfessionalReview: true;
};

@Injectable()
export class XRayAiAnalyzer {
  private readonly logger = new Logger(XRayAiAnalyzer.name);

  constructor(private readonly config: ConfigService) {}

  async analyze(
    image: Buffer,
    mimeType: 'image/jpeg' | 'image/png',
    type: string,
    region: string,
  ): Promise<{ result: XRayAnalysisResult; modelName: string }> {
    const baseUrl = this.config.get<string>('XRAY_AI_BASE_URL')?.trim();
    const modelName = this.config.get<string>('XRAY_AI_MODEL')?.trim();
    const apiKey = this.config.get<string>('XRAY_AI_API_KEY')?.trim();
    const provider =
      this.config.get<string>('XRAY_AI_PROVIDER')?.trim().toLowerCase() ??
      'openai-compatible';

    if (!baseUrl || !modelName) {
      throw new ServiceUnavailableException(
        'X-ray AI is not configured; set XRAY_AI_BASE_URL and XRAY_AI_MODEL',
      );
    }
    if (provider !== 'ollama' && provider !== 'openai-compatible') {
      throw new ServiceUnavailableException(
        'XRAY_AI_PROVIDER must be ollama or openai-compatible',
      );
    }

    let endpoint: URL;
    try {
      endpoint = new URL(baseUrl);
    } catch {
      throw new ServiceUnavailableException(
        'XRAY_AI_BASE_URL must be a valid HTTP or HTTPS URL',
      );
    }
    if (endpoint.protocol !== 'https:' && endpoint.protocol !== 'http:') {
      throw new ServiceUnavailableException(
        'XRAY_AI_BASE_URL must use HTTP or HTTPS',
      );
    }

    const endpointUrl = baseUrl
      .replace(/\/+$/, '')
      .endsWith('/chat/completions')
      ? baseUrl.replace(/\/+$/, '')
      : `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
    const prompt = [
      'Review this dental radiograph only as a clinical decision-support aid.',
      'Do not provide a diagnosis, treatment recommendation, or claim certainty.',
      'Describe only visible radiographic observations; state uncertainty clearly.',
      'Do not infer findings from patient history or from the image type alone.',
      'Always require review by a qualified dental professional.',
      `Image type: ${type}. Region supplied by clinician: ${region}.`,
      'Return only a JSON object with this exact shape:',
      '{"summary":"string","observations":[{"description":"string","location":"string","confidence":"low|moderate|high"}],"imageQuality":{"rating":"adequate|limited|unusable","issues":["string"]},"requiresProfessionalReview":true}',
      'Keep the summary and each observation concise. Use an empty observations array if there are no clear observations.',
    ].join(' ');
    const imageUrl = `data:${mimeType};base64,${image.toString('base64')}`;
    const imageContent =
      provider === 'ollama'
        ? { type: 'image_url', image_url: imageUrl }
        : { type: 'image_url', image_url: { url: imageUrl } };

    let response: Response;
    try {
      response = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: modelName,
          temperature: 0,
          messages: [
            {
              role: 'user',
              content: [{ type: 'text', text: prompt }, imageContent],
            },
          ],
        }),
        signal: AbortSignal.timeout(120_000),
      });
    } catch (error) {
      this.logger.error(
        'Could not reach the configured X-ray AI endpoint',
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadGatewayException('X-ray AI endpoint is unavailable');
    }

    if (!response.ok) {
      this.logger.error(`X-ray AI endpoint returned HTTP ${response.status}`);
      throw new BadGatewayException('X-ray AI analysis failed');
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      this.logger.error(
        'X-ray AI endpoint returned invalid JSON',
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadGatewayException('X-ray AI returned an invalid response');
    }

    const content = readAssistantContent(payload);
    if (!content) {
      throw new BadGatewayException('X-ray AI returned no analysis content');
    }

    return { result: parseAnalysisResult(content), modelName };
  }
}

function readAssistantContent(payload: unknown): string | null {
  if (!isRecord(payload) || !Array.isArray(payload.choices)) return null;
  const choice = payload.choices[0];
  if (!isRecord(choice) || !isRecord(choice.message)) return null;
  const content = choice.message.content;
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return null;
  return content
    .filter(
      (item): item is { type: string; text: string } =>
        isRecord(item) && item.type === 'text' && typeof item.text === 'string',
    )
    .map((item) => item.text)
    .join('\n');
}

function parseAnalysisResult(content: string): XRayAnalysisResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(
      content.replace(/^```(?:json)?\s*|\s*```$/gi, '').trim(),
    );
  } catch {
    throw new BadGatewayException(
      'X-ray AI returned an invalid analysis document',
    );
  }

  if (
    !isRecord(parsed) ||
    typeof parsed.summary !== 'string' ||
    parsed.summary.length === 0 ||
    parsed.summary.length > 2000 ||
    !Array.isArray(parsed.observations) ||
    parsed.observations.length > 20 ||
    !isRecord(parsed.imageQuality) ||
    !isImageQualityRating(parsed.imageQuality.rating) ||
    !Array.isArray(parsed.imageQuality.issues) ||
    parsed.imageQuality.issues.length > 20 ||
    parsed.requiresProfessionalReview !== true
  ) {
    throw new BadGatewayException(
      'X-ray AI returned an invalid analysis shape',
    );
  }

  const observations = parsed.observations.map((observation) => {
    if (
      !isRecord(observation) ||
      typeof observation.description !== 'string' ||
      observation.description.length === 0 ||
      observation.description.length > 1000 ||
      typeof observation.location !== 'string' ||
      observation.location.length > 200 ||
      !isConfidence(observation.confidence)
    ) {
      throw new BadGatewayException('X-ray AI returned an invalid observation');
    }
    return {
      description: observation.description,
      location: observation.location,
      confidence: observation.confidence,
    };
  });

  const issues = parsed.imageQuality.issues.map((issue) => {
    if (typeof issue !== 'string' || issue.length > 300) {
      throw new BadGatewayException(
        'X-ray AI returned an invalid image-quality note',
      );
    }
    return issue;
  });

  return {
    summary: parsed.summary,
    observations,
    imageQuality: {
      rating: parsed.imageQuality.rating,
      issues,
    },
    requiresProfessionalReview: true,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isConfidence(value: unknown): value is 'low' | 'moderate' | 'high' {
  return value === 'low' || value === 'moderate' || value === 'high';
}

function isImageQualityRating(
  value: unknown,
): value is 'adequate' | 'limited' | 'unusable' {
  return value === 'adequate' || value === 'limited' || value === 'unusable';
}
