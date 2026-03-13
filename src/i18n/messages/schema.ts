import type { zhCN } from "./zh-CN";

type MessageTree<Value> = {
  [Key in keyof Value]:
    Value[Key] extends string
      ? string
      : Value[Key] extends Record<string, unknown>
        ? MessageTree<Value[Key]>
        : never;
};

export type MessagesSchema = MessageTree<typeof zhCN>;

type Join<Key extends string, Rest extends string> = `${Key}.${Rest}`;

type LeafPaths<Value> = {
  [Key in keyof Value & string]:
    Value[Key] extends string
      ? Key
      : Value[Key] extends Record<string, unknown>
        ? Join<Key, LeafPaths<Value[Key]>>
        : never;
}[keyof Value & string];

export type MessageKey = LeafPaths<MessagesSchema>;
