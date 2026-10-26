export type AssistantChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export abstract class AssistantChatGateway {
  abstract complete(
    instructions: string,
    messages: AssistantChatMessage[],
  ): Promise<string>;
}
