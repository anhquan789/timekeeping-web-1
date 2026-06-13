export interface PageMeta {
  page: number;
  limit: number;
  total: number;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export interface Me {
  id: string;
  email: string;
  fullName: string;
  role: string;
  permissions: string[];
  departmentId: string | null;
  currentStatus: string;
}

export interface CurrentStatus {
  statusCode: string;
  statusLabel: string;
  startedAt: string | null;
  expectedReturnAt: string | null;
  contactAvailability: string;
  note: string | null;
  workLocation: string | null;
  meetingTitle: string | null;
  isOverdue: boolean;
}

export interface DashboardItem {
  userId: string;
  fullName: string;
  departmentName: string | null;
  position: string | null;
  statusCode: string;
  statusLabel: string;
  startedAt: string | null;
  expectedReturnAt: string | null;
  isOverdue: boolean;
  contactAvailability: string;
  publicNote: string | null;
}

export interface HistoryItem {
  id: string;
  userId: string;
  statusCode: string;
  statusLabel: string;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number | null;
  expectedReturnAt: string | null;
  actualReturnAt: string | null;
  note: string | null;
  lateReason: string | null;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

export interface OutingStatusResponse {
  requiresApproval: boolean;
  outingRequestId: string | null;
  currentStatus: CurrentStatus;
}

// ---- chat ----

export interface LastMessage {
  id: string;
  senderId: string;
  messageType: string;
  body: string | null;
  createdAt: string;
}

export interface MemberStatus {
  statusCode: string;
  statusLabel: string;
  contactAvailability: string;
}

export interface Conversation {
  id: string;
  type: "direct" | "group" | "department";
  name: string | null;
  avatarUrl: string | null;
  departmentId: string | null;
  memberCount: number;
  lastMessage: LastMessage | null;
  unreadCount: number;
  memberStatus: MemberStatus | null;
  createdAt: string;
}

export interface ConversationMember {
  userId: string;
  fullName: string | null;
  avatarUrl: string | null;
  memberRole: string;
  joinedAt: string;
}

export interface ConversationDetail {
  id: string;
  type: string;
  name: string | null;
  avatarUrl: string | null;
  departmentId: string | null;
  members: ConversationMember[];
  createdAt: string;
}

export interface Reaction {
  id: string;
  userId: string;
  reaction: string;
}

export interface FileRef {
  id: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  url: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  messageType: string;
  body: string | null;
  replyToMessageId: string | null;
  file: FileRef | null;
  isUrgent: boolean;
  isDeleted: boolean;
  editedAt: string | null;
  reactions: Reaction[];
  createdAt: string;
}

// ---- notifications ----

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, string> | null;
  readAt: string | null;
  createdAt: string;
}

// ---- users ----

export interface UserListItem {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  department: { id: string; name: string } | null;
  position: string | null;
  currentStatus: { statusCode: string; statusLabel: string };
}

// ---- outing ----

export interface OutingRequest {
  id: string;
  user: { id: string; fullName: string };
  requestType: string;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED" | "RETURNED" | "CANCELLED";
  purpose: string;
  destinationName: string;
  destinationAddress: string | null;
  customerName: string | null;
  contactPerson: string | null;
  contactPhone: string | null;
  transportationType: string | null;
  startTime: string;
  expectedReturnTime: string;
  actualReturnTime: string | null;
  approver: { id: string; fullName: string } | null;
  approvedAt: string | null;
  rejectReason: string | null;
  resultNote: string | null;
  lateReason: string | null;
  note: string | null;
  companionIds: string[];
  createdAt: string;
}

export const OUTING_STATUS_LABELS: Record<string, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  RETURNED: "Đã quay lại",
  CANCELLED: "Đã hủy",
};

export const OUTING_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-blue-100 text-blue-800",
  REJECTED: "bg-red-100 text-red-800",
  RETURNED: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-100 text-gray-600",
};

export const STATUS_COLORS: Record<string, string> = {
  WORKING: "bg-green-100 text-green-800",
  BREAK: "bg-yellow-100 text-yellow-800",
  LUNCH: "bg-orange-100 text-orange-800",
  MEETING: "bg-blue-100 text-blue-800",
  OUTING: "bg-purple-100 text-purple-800",
  REMOTE_WORK: "bg-cyan-100 text-cyan-800",
  FINISHED: "bg-gray-200 text-gray-700",
  NOT_STARTED: "bg-gray-100 text-gray-500",
};

export const CONTACT_LABELS: Record<string, string> = {
  AVAILABLE: "Liên hệ được",
  PHONE_ONLY: "Chỉ điện thoại",
  URGENT_ONLY: "Chỉ khẩn cấp",
  UNAVAILABLE: "Không liên hệ",
};

// ---- departments (full) ----

export interface DepartmentDetail {
  id: string;
  code: string;
  name: string;
  description: string | null;
  parentId: string | null;
  manager: { id: string; fullName: string } | null;
  memberCount: number;
  isActive: boolean;
}

// ---- admin ----

export interface Role {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  permissionCodes: string[];
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  description: string | null;
}

export interface StatusConfig {
  code: string;
  label: string;
  color: string | null;
  icon: string | null;
  isSystem: boolean;
  requiresReturnTime: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface AuditLogItem {
  id: string;
  actorId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface UserDetail {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  department: { id: string; name: string } | null;
  position: string | null;
  currentStatus: { statusCode: string; statusLabel: string };
  phone: string | null;
  role: string | null;
  managerId: string | null;
  employmentStatus: string | null;
}

// ---- reports ----

export interface DailyReport {
  date: string;
  departmentId: string | null;
  totalEmployees: number;
  started: number;
  notStarted: number;
  statusCounts: Record<string, number>;
  overdue: number;
}

export interface UserReport {
  userId: string;
  fullName: string;
  from: string | null;
  to: string | null;
  totalWorkingMinutes: number;
  totalBreakMinutes: number;
  totalMeetingMinutes: number;
  totalOutingMinutes: number;
  outingCount: number;
  lateReturnCount: number;
  entries: {
    statusCode: string;
    startedAt: string;
    endedAt: string | null;
    durationMinutes: number | null;
    note: string | null;
    lateReason: string | null;
  }[];
}

export interface OutingReport {
  from: string | null;
  to: string | null;
  departmentId: string | null;
  total: number;
  byStatus: Record<string, number>;
  lateReturns: number;
}
