<template>
  <editor-content :editor="editor" class="focus:outline-none" />
</template>
<script>
import { Editor, EditorContent } from "@tiptap/vue-3";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

export default {
  components: {
    EditorContent
  },
  props: {
    modelValue: {
      type: String,
      default: ""
    },
    placeholder: {
      type: String,
      default: "Let's write something amazing today …"
    },
    editable: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      editor: null
    };
  },
  emits: ["update:modelValue", "change"],
  watch: {
    modelValue(value) {
      console.log(value);
      const isSame = this.editor.getHTML() === value;
      if (isSame) {
        return;
      }
      this.editor.commands.setContent(value);
    }
  },
  mounted() {
    this.editor = new Editor({
      editable: this.editable,
      content: this.modelValue,
      extensions: [
        StarterKit,
        Placeholder.configure({
          showOnlyWhenEditable: false,
          showOnlyCurrent: false,
          includeChildren: true,
          placeholder: this.placeholder
        })
      ],
      editorProps: {
        attributes: {
          class:
            "text-white text-sm bg-[#2C2C2C] border border-[#7E7E7E] rounded-md px-6 py-8 focus:outline-none"
        }
      },
      onUpdate: () => {
        this.$emit("update:modelValue", this.editor.getHTML());
        this.$emit("change", this.editor.getHTML());
      },
    });
  },
  beforeUnmount() {
    this.editor.destroy();
  }
};
</script>
<style>
.ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: #adb5bd;
  pointer-events: none;
  height: 0;
}
.ProseMirror pre {
  background: #0d0d0d;
  color: #fff;
  font-family: "JetBrainsMono", monospace;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
}
.ProseMirror pre code {
  color: inherit;
  padding: 0;
  background: none;
  font-size: 0.8rem;
}
.ProseMirror > * + * {
  margin-top: 0.75em;
}
.ProseMirror ul,
.ProseMirror ol {
  padding: 0 1rem;
  list-style-type: circle;
}
.ProseMirror blockquote {
  padding-left: 1rem;
  border-left: 2px solid rgba(13, 13, 13, 0.1);
}
.ProseMirror h2 {
  font-size: 20px;
  font-weight: 500;
}
.ProseMirror h3 {
  font-size: 15px;
  font-weight: 600;
}
.ProseMirror a {
  color: #2a98e9;
  text-decoration: underline;
}
</style>
