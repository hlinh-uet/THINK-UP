import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const settings=sqliteTable('settings',{key:text('key').primaryKey(),value:text('value').notNull()});
export const users=sqliteTable('users',{id:text('id').primaryKey(),email:text('email').notNull(),name:text('name').notNull(),role:text('role').notNull(),active:integer('active').notNull().default(1),createdAt:text('created_at').notNull()},t=>[uniqueIndex('idx_users_email').on(t.email)]);
export const userProfiles=sqliteTable('user_profiles',{
  userId:text('user_id').primaryKey().references(()=>users.id),
  phone:text('phone').notNull().default(''),bio:text('bio').notNull().default(''),
  avatarKey:text('avatar_key'),avatarType:text('avatar_type'),
  revision:integer('revision').notNull().default(0),updatedAt:text('updated_at').notNull(),
});
export const courses=sqliteTable('courses',{id:text('id').primaryKey(),name:text('name').notNull(),code:text('code').notNull(),weeksJson:text('weeks_json').notNull(),rubricJson:text('rubric_json').notNull(),createdAt:text('created_at').notNull()});
export const memberships=sqliteTable('memberships',{id:text('id').primaryKey(),courseId:text('course_id').notNull().references(()=>courses.id),userId:text('user_id').notNull().references(()=>users.id),role:text('role').notNull()},t=>[uniqueIndex('idx_membership_unique').on(t.courseId,t.userId),index('idx_membership_user').on(t.userId)]);
export const invitations=sqliteTable('invitations',{id:text('id').primaryKey(),email:text('email').notNull(),name:text('name').notNull(),role:text('role').notNull(),courseId:text('course_id').references(()=>courses.id)},t=>[uniqueIndex('idx_invite_email_course').on(t.email,t.courseId)]);
export const reflections=sqliteTable('reflections',{id:text('id').primaryKey(),userId:text('user_id').notNull().references(()=>users.id),courseId:text('course_id').references(()=>courses.id),title:text('title').notNull(),week:integer('week').notNull(),contentJson:text('content_json').notNull(),status:text('status').notNull(),rev:integer('rev').notNull(),latestVersion:text('latest_version').notNull(),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull()},t=>[index('idx_reflections_user').on(t.userId),index('idx_reflections_course_status').on(t.courseId,t.status)]);
export const versions=sqliteTable('versions',{id:text('id').primaryKey(),reflectionId:text('reflection_id').notNull().references(()=>reflections.id),contentJson:text('content_json').notNull(),title:text('title').notNull(),stage:text('stage').notNull(),createdAt:text('created_at').notNull()},t=>[index('idx_versions_reflection').on(t.reflectionId)]);
export const analyses=sqliteTable('analyses',{id:text('id').primaryKey(),reflectionId:text('reflection_id').notNull().references(()=>reflections.id),versionId:text('version_id').notNull().references(()=>versions.id),kind:text('kind').notNull(),provider:text('provider').notNull(),resultJson:text('result_json').notNull(),rubricJson:text('rubric_json').notNull(),createdAt:text('created_at').notNull()},t=>[index('idx_analyses_reflection').on(t.reflectionId)]);
export const reviews=sqliteTable('reviews',{id:text('id').primaryKey(),reflectionId:text('reflection_id').notNull().references(()=>reflections.id),versionId:text('version_id').notNull().references(()=>versions.id),reviewerId:text('reviewer_id').notNull().references(()=>users.id),comment:text('comment').notNull(),scoresJson:text('scores_json').notNull(),total:integer('total'),level:integer('level'),decision:text('decision').notNull(),rubricJson:text('rubric_json').notNull(),createdAt:text('created_at').notNull()},t=>[index('idx_reviews_reflection').on(t.reflectionId)]);
export const actions=sqliteTable('actions',{id:text('id').primaryKey(),userId:text('user_id').notNull().references(()=>users.id),reflectionId:text('reflection_id').references(()=>reflections.id),text:text('text').notNull(),due:text('due').notNull(),status:text('status').notNull(),review:text('review').notNull(),createdAt:text('created_at').notNull()},t=>[index('idx_actions_user').on(t.userId)]);
export const attachments=sqliteTable('attachments',{id:text('id').primaryKey(),reflectionId:text('reflection_id').notNull().references(()=>reflections.id),name:text('name').notNull(),type:text('type').notNull(),size:integer('size').notNull(),objectKey:text('object_key').notNull(),createdAt:text('created_at').notNull()},t=>[index('idx_attachments_reflection').on(t.reflectionId)]);
export const audit=sqliteTable('audit',{id:text('id').primaryKey(),userId:text('user_id').notNull(),action:text('action').notNull(),targetId:text('target_id').notNull(),detail:text('detail').notNull(),createdAt:text('created_at').notNull()});
export const credentials=sqliteTable('credentials',{userId:text('user_id').primaryKey().references(()=>users.id),passwordHash:text('password_hash').notNull(),createdAt:text('created_at').notNull()});
export const sessions=sqliteTable('sessions',{tokenHash:text('token_hash').primaryKey(),userId:text('user_id').notNull().references(()=>users.id),expiresAt:integer('expires_at').notNull()},t=>[index('idx_sessions_user').on(t.userId),index('idx_sessions_expiry').on(t.expiresAt)]);
export const authLimits=sqliteTable('auth_limits',{key:text('key').primaryKey(),windowStart:integer('window_start').notNull(),attempts:integer('attempts').notNull()});

export const conversations=sqliteTable('chat_conversations',{
  id:text('id').primaryKey(),
  lowUserId:text('low_user_id').notNull().references(()=>users.id),
  highUserId:text('high_user_id').notNull().references(()=>users.id),
  lastMessageId:integer('last_message_id').notNull().default(0),
  lowReadId:integer('low_read_id').notNull().default(0),
  highReadId:integer('high_read_id').notNull().default(0),
  createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),
},t=>[uniqueIndex('idx_chat_pair').on(t.lowUserId,t.highUserId),index('idx_chat_high_user').on(t.highUserId)]);
export const messages=sqliteTable('chat_messages',{
  id:integer('id').primaryKey({autoIncrement:true}),
  conversationId:text('conversation_id').notNull().references(()=>conversations.id),
  senderId:text('sender_id').notNull().references(()=>users.id),
  senderName:text('sender_name').notNull(),senderRole:text('sender_role').notNull(),
  clientId:text('client_id').notNull(),body:text('body').notNull(),createdAt:text('created_at').notNull(),
},t=>[index('idx_chat_messages_conversation').on(t.conversationId,t.id),uniqueIndex('idx_chat_send_retry').on(t.senderId,t.clientId)]);

export const reflectionCoachTurns=sqliteTable('reflection_coach_turns',{
  id:text('id').primaryKey(),reflectionId:text('reflection_id').notNull().references(()=>reflections.id),
  userId:text('user_id').notNull().references(()=>users.id),clientId:text('client_id').notNull(),
  question:text('question').notNull(),reply:text('reply'),status:text('status').notNull(),
  provider:text('provider'),includedAttachments:integer('included_attachments').notNull().default(0),
  createdAt:text('created_at').notNull(),
},t=>[uniqueIndex('idx_reflection_coach_retry').on(t.userId,t.clientId),index('idx_reflection_coach_history').on(t.reflectionId,t.createdAt)]);

// Additive extension records preserve all historical reflection/review tables.
export const learningRecords=sqliteTable('learning_records',{
 id:text('id').primaryKey(),kind:text('kind').notNull(),ownerId:text('owner_id').notNull(),
 reflectionId:text('reflection_id'),courseId:text('course_id'),versionId:text('version_id'),
 payloadJson:text('payload_json').notNull(),revision:integer('revision').notNull().default(1),
 createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),
},t=>[index('idx_learning_reflection_kind').on(t.reflectionId,t.kind),index('idx_learning_owner_kind').on(t.ownerId,t.kind),index('idx_learning_course_kind').on(t.courseId,t.kind)]);
