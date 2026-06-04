/* START: THIS SECTION CODE IS CANNOT BE CHANGED, YOU ONLY READ IT */
export interface FieldSchemaType {
  fieldName?: string;
  type:
    | "string"
    | "number"
    | "boolean"
    | "object"
    | "array"
    | "color"
    | "url"
    | "enum"
    | "datetime"
    | "file"
    | "files";
  required?: boolean;
  label?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  options?: string[];
  fields?: FieldSchemaType[];
  item?: FieldSchemaType;
}
/* END: THIS SECTION CODE IS CANNOT BE CHANGED, YOU ONLY READ IT */

export type ConfigurableSchemas = {
  formSchema: FieldSchemaType[];
};



export const configurableSchemas: ConfigurableSchemas = {
  formSchema: [
    {
      fieldName: "appName",
      type: "string",
      required: true,
      label: "App Name",
    },
    {
      fieldName: "logoUrl",
      type: "url",
      required: true,
      label: "Logo URL",
    },
    {
      fieldName: "brandColor",
      type: "object",
      required: true,
      label: "Brand Color",
      fields: [
        {
          fieldName: "primary",
          type: "color",
          required: true,
          label: "Primary",
        },
        {
          fieldName: "secondary",
          type: "color",
          required: true,
          label: "Secondary",
        },
        {
          fieldName: "accent",
          type: "color",
          required: true,
          label: "Accent",
        },
      ],
    },
    {
      fieldName: "tagline",
      type: "string",
      required: false,
      label: "Tagline",
      maxLength: 120,
    },
    {
      fieldName: "playCtaLabel",
      type: "string",
      required: false,
      label: "Play CTA Label",
      maxLength: 30,
    },
    {
      fieldName: "controlsHint",
      type: "string",
      required: false,
      label: "Controls Hint",
      maxLength: 120,
    },
    {
      fieldName: "versionTag",
      type: "string",
      required: false,
      label: "Version Tag",
      maxLength: 30,
    },
    {
      fieldName: "skyColors",
      type: "object",
      required: false,
      label: "Sky Colors",
      fields: [
        { fieldName: "day", type: "color", required: false, label: "Day Sky" },
        { fieldName: "sunset", type: "color", required: false, label: "Sunset Sky" },
        { fieldName: "night", type: "color", required: false, label: "Night Sky" },
      ],
    },
    {
      fieldName: "worldSeed",
      type: "number",
      required: false,
      label: "Default World Seed",
    },
    {
      fieldName: "dayDurationMinutes",
      type: "number",
      required: false,
      label: "Day Length (minutes)",
      min: 1,
      max: 60,
    },
    {
      fieldName: "renderDistance",
      type: "number",
      required: false,
      label: "Render Distance (chunks)",
      min: 1,
      max: 8,
    },
    {
      fieldName: "enableStarterItems",
      type: "boolean",
      required: false,
      label: "Give Starter Items",
    },
    {
      fieldName: "footerText",
      type: "string",
      required: false,
      label: "Footer Text",
      maxLength: 200,
    },
  ],
};
