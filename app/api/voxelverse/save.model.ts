// Mongo-backed mirror of player save files. Optional — LocalStorage is the
// primary store; this lets you back up / share saves across devices later.

import { prop, getModelForClass, modelOptions, Severity } from "@typegoose/typegoose";
import { CommonTypegooseEntity } from "~/api/models/base/common-typegoose.entity";

@modelOptions({
  schemaOptions: {
    collection: "tbl_voxel_saves",
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  },
  options: { allowMixed: Severity.ALLOW },
})
export class VoxelSave extends CommonTypegooseEntity {
  @prop({ type: String, required: true, unique: true, index: true })
  worldName!: string;

  @prop({ type: Number, required: true })
  seed!: number;

  @prop({ type: Object, required: true })
  payload!: Record<string, unknown>;

  @prop({ type: Date, default: () => new Date() })
  savedAt!: Date;
}

export const VoxelSaveModel = getModelForClass(VoxelSave);
