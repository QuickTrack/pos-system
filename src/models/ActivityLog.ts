import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IActivityLog extends Document {
  user: mongoose.Types.ObjectId;
  userName: string;
  action: string;
  module: 'users' | 'products' | 'sales' | 'customers' | 'suppliers' | 'purchases' | 'settings' | 'branches' | 'categories' | 'reports' | 'system';
  description: string;
  ipAddress?: string;
  userAgent?: string;
  branch?: mongoose.Types.ObjectId;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    action: { type: String, required: true },
    module: { 
      type: String, 
      enum: ['users', 'products', 'sales', 'customers', 'suppliers', 'purchases', 'settings', 'branches', 'categories', 'reports', 'system'],
      required: true 
    },
    description: { type: String, required: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// Index for querying logs
ActivityLogSchema.index({ createdAt: -1 });
ActivityLogSchema.index({ user: 1, createdAt: -1 });
ActivityLogSchema.index({ module: 1, createdAt: -1 });

const ActivityLog: Model<IActivityLog> = mongoose.models.ActivityLog || mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);

export default ActivityLog;
