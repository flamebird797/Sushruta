export const regionAliasMap: Record<string, string> = {
  // 🧠 Head & Face
  "forehead": "forehead",
  "scalp front": "scalp_front",
  "front of scalp": "scalp_front",
  "scalp back": "scalp_back",
  "back of scalp": "scalp_back",
  "left jaw": "jaw_left",
  "right jaw": "jaw_right",
  "jaw left": "jaw_left",
  "jaw right": "jaw_right",
  "mouth": "mouth",
  "left face": "face_left",
  "right face": "face_right",
  "face left": "face_left",
  "face right": "face_right",

  // 🧍 Neck
  "neck front": "neck_front",
  "front neck": "neck_front",
  "neck back": "neck_back",
  "back of neck": "neck_back",

  // 🫀 Chest & Abdomen
  "left chest": "chest_left",
  "right chest": "chest_right",
  "sternum": "sternum",
  "upper left abdomen": "abdomen_upper_left",
  "upper right abdomen": "abdomen_upper_right",
  "lower left abdomen": "abdomen_lower_left",
  "lower right abdomen": "abdomen_lower_right",
  "pelvis": "pelvis_front",
  "groin": "groin",

  // 🍑 Back & Glutes
  "upper spine": "spine_upper",
  "upper back": "back_right_upper",
  "lower back": "back_right_lower",
  "upper left back": "back_left_upper",
  "upper right back": "back_right_upper",
  "lower left back": "back_left_lower",
  "lower right back": "back_right_lower",
  "left glute": "glutes_left",
  "right glute": "glutes_right",
  "left buttock": "glutes_left",
  "right buttock": "glutes_right",
  "tailbone": "tailbone",

  // 💪 Shoulders & Arms
  "left shoulder": "shoulder_left",
  "right shoulder": "shoulder_right",
  "left upper arm": "arm_left_upper",
  "right upper arm": "arm_right_upper",
  "left lower arm": "arm_left_lower",
  "right lower arm": "arm_right_lower",
  "left elbow": "elbow_left",
  "right elbow": "elbow_right",
  "left hand": "hand_left",
  "right hand": "hand_right",

  // 🦵 Legs
  "left thigh": "thigh_left",
  "right thigh": "thigh_right",
  "left knee": "knee_left",
  "right knee": "knee_right",
  "left calf": "calf_left",
  "right calf": "calf_right",
  "left foot": "foot_left",
  "right foot": "foot_right",
  "left feet": "feet_left",
  "right feet": "feet_right"
};

export function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/[^a-z0-9 ]+/g, '').replace(/\s+/g, ' ');
}

export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j - 1] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j] + 1
        );
      }
    }
  }
  return dp[m][n];
}