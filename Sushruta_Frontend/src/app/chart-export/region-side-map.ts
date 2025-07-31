export async function getRegionSideMap(): Promise<Record<string, 'front' | 'back'>> {
  return {
    // 🧠 Head
    forehead: 'front',
    scalp_front: 'front',
    scalp_back: 'back',
    temple_left: 'front',
    temple_right: 'front',
    eye_left: 'front',
    eye_right: 'front',
    ear_left: 'back',
    ear_right: 'back',
    cheek_left: 'front',
    cheek_right: 'front',
    jaw_left: 'front',
    jaw_right: 'front',
    nose: 'front',
    mouth: 'front',

    // 🦴 Neck
    neck_front: 'front',
    neck_back: 'back',

    // 🧍 Shoulders
    shoulder_left: 'front',
    shoulder_right: 'front',
    armpit_left: 'front',
    armpit_right: 'front',

    // 💪 Arms
    bicep_left: 'front',
    bicep_right: 'front',
    tricep_left: 'back',
    tricep_right: 'back',
    elbow_left: 'back',
    elbow_right: 'back',
    forearm_left: 'front',
    forearm_right: 'front',
    wrist_left: 'front',
    wrist_right: 'front',
    hand_left: 'front',
    hand_right: 'front',

    // 🫀 Torso (Front)
    chest_left: 'front',
    chest_right: 'front',
    sternum: 'front',
    epigastric: 'front',
    umbilical: 'front',
    hypogastric: 'front',
    left_hypochondriac: 'front',
    right_hypochondriac: 'front',
    left_lumbar: 'front',
    right_lumbar: 'front',
    left_iliac: 'front',
    right_iliac: 'front',
    groin: 'front',
    pelvic_area: 'front',

    // 🔙 Torso (Back)
    back_upper_left: 'back',
    back_upper_right: 'back',
    back_lower_left: 'back',
    back_lower_right: 'back',
    spine_upper: 'back',
    spine_middle: 'back',
    spine_lower: 'back',

    // 🦵 Legs
    thigh_left: 'front',
    thigh_right: 'front',
    knee_left: 'front',
    knee_right: 'front',
    shin_left: 'front',
    shin_right: 'front',
    calf_left: 'back',
    calf_right: 'back',
    ankle_left: 'front',
    ankle_right: 'front',
    foot_left: 'front',
    foot_right: 'front',
    glute_left: 'back',
    glute_right: 'back',
  };
}