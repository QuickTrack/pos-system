import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISession extends Document {
  user: mongoose.Types.ObjectId;
  userName: string;
  userEmail: string;
  tokenId: string;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: string;
  location?: string;
  isActive: boolean;
  lastActivity: Date;
  expiresAt: Date;
  createdAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    tokenId: { type: String, required: true, unique: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    deviceInfo: { type: String },
    location: { type: String },
    isActive: { type: Boolean, default: true },
    lastActivity: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// Index for querying sessions
SessionSchema.index({ user: 1, isActive: 1 });
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
SessionSchema.index({ tokenId: 1 });

const Session: Model<ISession> = mongoose.models.Session || mongoose.model<ISession>('Session', SessionSchema);

export default Session;
