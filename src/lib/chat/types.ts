export type RoomRow = {
  id: number;
  slug: string;
  name: string;
  description: string;
  kind: string;
  created_by: string;
  created_at: string;
  member_count: number;
  last_body: string | null;
  last_at: string | null;
  unread?: number;
  pinned_message_id?: number | null;
};

export type MessageRow = {
  id: number;
  room_id: number;
  user_id: string;
  body: string;
  created_at: string;
  display_name: string;
  avatar_url: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  attachment_data: string | null;
};

export type ProfileRow = {
  user_id: string;
  username: string | null;
  display_name: string;
  email: string | null;
  phone: string | null;
  bio: string | null;
  avatar_url: string | null;
  online?: boolean;
  last_seen?: string | null;
  badge?: string | null;
  wasl_no?: number | null;
  role?: string | null;
  points?: number | null;
};

export type RoomDetail = {
  room: RoomRow;
  members: ProfileRow[];
  pinned?: { id: number; body: string; display_name: string } | null;
};

export type FriendshipRow = {
  id: number;
  status: string;
  created_at: string;
  peer: ProfileRow;
  incoming: boolean;
};

export type NotificationRow = {
  id: number;
  kind: string;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  created_at: string;
};

export type StoryRow = {
  id: number;
  user_id: string;
  kind: string;
  body: string;
  image_data: string | null;
  tint: string;
  created_at: string;
  display_name: string;
  avatar_url: string | null;
  username: string | null;
  likes: number;
  liked: boolean;
  views: number;
  visibility?: string | null;
};

export type PostRow = {
  id: number;
  user_id: string;
  kind: string;
  body: string;
  media_data: string | null;
  visibility: string;
  created_at: string;
  display_name: string;
  avatar_url: string | null;
  username: string | null;
  wasl_no: number | null;
  likes: number;
  liked: boolean;
  comments?: number;
};

export type PostCommentRow = {
  id: number;
  post_id: number;
  user_id: string;
  body: string;
  created_at: string;
  display_name: string;
  avatar_url: string | null;
};
