// tsup.config.ts
import { defineConfig } from "tsup";
var tsup_config_default = defineConfig({
  entry: ["src/**/*.ts", "!src/**/*.d.ts", "src/**/*.tsx", "!src/**/*.test.ts*"],
  skipNodeModulesBundle: true,
  noExternal: [
    "@answeroverflow/elastic-types",
    "@answeroverflow/prisma-types",
    "@answeroverflow/db",
    "@answeroverflow/auth",
    "@answeroverflow/api",
    "@answeroverflow/discordjs-utils",
    "@answeroverflow/utils",
    "@answeroverflow/cache"
  ]
});
export {
  tsup_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidHN1cC5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9faW5qZWN0ZWRfZmlsZW5hbWVfXyA9IFwiL0Fuc3dlck92ZXJmbG93L2FwcHMvZGlzY29yZC1ib3QvdHN1cC5jb25maWcudHNcIjtjb25zdCBfX2luamVjdGVkX2Rpcm5hbWVfXyA9IFwiL0Fuc3dlck92ZXJmbG93L2FwcHMvZGlzY29yZC1ib3RcIjtjb25zdCBfX2luamVjdGVkX2ltcG9ydF9tZXRhX3VybF9fID0gXCJmaWxlOi8vL0Fuc3dlck92ZXJmbG93L2FwcHMvZGlzY29yZC1ib3QvdHN1cC5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd0c3VwJztcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgZW50cnk6IFsnc3JjLyoqLyoudHMnLCAnIXNyYy8qKi8qLmQudHMnLCAnc3JjLyoqLyoudHN4JywgJyFzcmMvKiovKi50ZXN0LnRzKiddLFxuICBza2lwTm9kZU1vZHVsZXNCdW5kbGU6IHRydWUsXG4gIG5vRXh0ZXJuYWw6IFtcbiAgICBcIkBhbnN3ZXJvdmVyZmxvdy9lbGFzdGljLXR5cGVzXCIsXG4gICAgXCJAYW5zd2Vyb3ZlcmZsb3cvcHJpc21hLXR5cGVzXCIsXG4gICAgJ0BhbnN3ZXJvdmVyZmxvdy9kYicsXG4gICAgJ0BhbnN3ZXJvdmVyZmxvdy9hdXRoJyxcbiAgICAnQGFuc3dlcm92ZXJmbG93L2FwaScsXG4gICAgXCJAYW5zd2Vyb3ZlcmZsb3cvZGlzY29yZGpzLXV0aWxzXCIsXG4gICAgXCJAYW5zd2Vyb3ZlcmZsb3cvdXRpbHNcIixcbiAgICBcIkBhbnN3ZXJvdmVyZmxvdy9jYWNoZVwiLFxuICBdLFxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQThPLFNBQVMsb0JBQW9CO0FBRTNRLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLE9BQU8sQ0FBQyxlQUFlLGtCQUFrQixnQkFBZ0Isb0JBQW9CO0FBQUEsRUFDN0UsdUJBQXVCO0FBQUEsRUFDdkIsWUFBWTtBQUFBLElBQ1Y7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
