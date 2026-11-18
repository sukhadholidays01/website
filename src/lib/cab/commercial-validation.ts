import { z } from "zod";
export const advancePolicySchema = z.object({
  mode:z.enum(["percent","fixed"]),value:z.number().finite().positive().multipleOf(0.01).max(10000000),
  minimum:z.number().finite().min(1).multipleOf(0.01).max(10000000),maximum:z.number().finite().positive().max(10000000).nullable(),
  maximumPercent:z.number().finite().positive().max(100),currency:z.literal("INR"),
  required:z.boolean(),allowOverride:z.boolean(),beforeAssignment:z.boolean(),beforeDispatch:z.boolean(),
}).strict().superRefine((p,c)=>{if(p.mode==="percent"&&p.value>p.maximumPercent)c.addIssue({code:"custom",message:"Default exceeds the percentage limit."});if(p.maximum!==null&&p.maximum<p.minimum)c.addIssue({code:"custom",message:"Maximum must not be less than minimum."});});
