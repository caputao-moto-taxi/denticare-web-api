export type CreateConversationCommand = {
  recipientId: string;
  subject: string;
  category?: 'staff' | 'patients' | 'post-care';
};

export type ChatAttachmentRecord = {
  id: string;
  storageKey: string;
  name: string;
  mimeType: string;
  size: number;
};

export type SendMessageCommand = {
  content: string;
  attachments?: ChatAttachmentRecord[];
};

export type ChatAttachmentView = Omit<ChatAttachmentRecord, 'storageKey'> & {
  url: string;
};

export type ChatMessageUpload = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

// A message as seen by one viewer: `sender` is relative to that viewer.
export type ChatMessageView = {
  id: string;
  sender: 'me' | 'contact';
  text: string;
  sentAt: string;
  attachments?: ChatAttachmentView[];
};

export type ChatAttachmentFile = {
  storageKey: string;
  name: string;
  mimeType: string;
};

export type ConversationParticipants = {
  starterId: string;
  recipientId: string;
};

export type ChatConversationScopeRecord = ConversationParticipants & {
  id: string;
  branchId: string;
};

export type ChatParticipantRecord = {
  id: string;
  email: string;
  Person: { firstName: string; lastName: string }[];
};

export type ChatUserRecord = ChatParticipantRecord & {
  branchId: string | null;
  isActive: boolean;
  deletedAt: Date | null;
  Role: { slug: string } | null;
};

export type ChatMessageRecord = {
  id: string;
  conversationId: string;
  authorId: string;
  content: string;
  createdAt: Date;
  attachments: unknown;
  author: ChatParticipantRecord;
};

export type ChatConversationRecord = {
  id: string;
  branchId: string;
  starterId: string;
  recipientId: string;
  category: string;
  channel: string;
  subject: string;
  updatedAt: Date;
  starterLastReadAt: Date | null;
  recipientLastReadAt: Date | null;
  starter: ChatParticipantRecord;
  recipient: ChatParticipantRecord;
  messages: ChatMessageRecord[];
};

export type ChatConversationView = {
  id: string;
  contact: {
    id: string;
    name: string;
    email: string;
    avatar: string;
  };
  category: string;
  channel: string;
  subject: string;
  updatedAt: string;
  unreadCount: number;
  messages: ChatMessageView[];
};

export type ChatContactView = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
};

export type ChatConversationListCriteria = {
  branchId: string;
  participantId: string;
  category?: string;
  updatedAtFrom?: Date;
  updatedAtToExclusive?: Date;
  search?: string;
  skip: number;
  take: number;
  messageLimit: number;
};

export type ChatContactListCriteria = {
  branchId: string;
  excludedUserId: string;
  role?: string;
  createdAtFrom?: Date;
  createdAtToExclusive?: Date;
  search?: string;
  skip: number;
  take: number;
};

export type ChatMessageListCriteria = {
  conversationId: string;
  createdAtFrom?: Date;
  createdAtToExclusive?: Date;
  search?: string;
  skip: number;
  take: number;
};

export type CreateConversationData = {
  branchId: string;
  starterId: string;
  recipientId: string;
  subject: string;
  category: string;
};

export type CreateMessageData = {
  conversationId: string;
  authorId: string;
  content: string;
  attachments?: ChatAttachmentRecord[];
};

export type ChatConversationUpdate = {
  starterLastReadAt?: Date;
  recipientLastReadAt?: Date;
  updatedAt?: Date;
};

export abstract class IChatRepository {
  abstract transaction<T>(
    operation: (repository: IChatRepository) => Promise<T>,
  ): Promise<T>;

  abstract unreadCount(input: {
    userId: string;
    branchId: string;
  }): Promise<{ count: number }>;
  abstract listConversations(
    criteria: ChatConversationListCriteria,
  ): Promise<{ conversations: ChatConversationRecord[]; total: number }>;
  abstract listContacts(
    criteria: ChatContactListCriteria,
  ): Promise<{ contacts: ChatUserRecord[]; total: number }>;
  abstract findConversation(
    conversationId: string,
  ): Promise<ChatConversationScopeRecord | null>;
  abstract findUser(userId: string): Promise<ChatUserRecord | null>;
  abstract createConversation(
    data: CreateConversationData,
  ): Promise<ChatConversationRecord>;
  abstract listMessages(
    criteria: ChatMessageListCriteria,
  ): Promise<{ messages: ChatMessageRecord[]; total: number }>;
  abstract createMessage(data: CreateMessageData): Promise<ChatMessageRecord>;
  abstract updateConversation(
    conversationId: string,
    data: ChatConversationUpdate,
  ): Promise<void>;
  abstract findMessageAttachments(
    conversationId: string,
    messageId: string,
  ): Promise<{ attachments: unknown } | null>;
}
