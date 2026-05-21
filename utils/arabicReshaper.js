// A simple Unicode Arabic Reshaper and RTL word reorder utility
const ALPHABET = {
  // [isolated, final, medial, initial]
  0x0621: [0xFE80, 0xFE80, 0xFE80, 0xFE80], // Hamza
  0x0622: [0xFE81, 0xFE82, 0xFE82, 0xFE81], // Alef Madda
  0x0623: [0xFE83, 0xFE84, 0xFE84, 0xFE83], // Alef Hamza Above
  0x0624: [0xFE85, 0xFE86, 0xFE86, 0xFE85], // Waw Hamza Above
  0x0625: [0xFE87, 0xFE88, 0xFE88, 0xFE87], // Alef Hamza Below
  0x0626: [0xFE89, 0xFE8A, 0xFE8C, 0xFE8B], // Yeh Hamza Above
  0x0627: [0xFE8D, 0xFE8E, 0xFE8E, 0xFE8D], // Alef
  0x0628: [0xFE8F, 0xFE90, 0xFE92, 0xFE91], // Baa
  0x0629: [0xFE93, 0xFE94, 0xFE94, 0xFE93], // Teh Marbuta
  0x062A: [0xFE95, 0xFE96, 0xFE98, 0xFE97], // Teh
  0x062B: [0xFE99, 0xFE9A, 0xFE9C, 0xFE9B], // Theh
  0x062C: [0xFE9D, 0xFE9E, 0xFEA0, 0xFEA1], // Jeem
  0x062D: [0xFEA1, 0xFEA2, 0xFEA4, 0xFEA3], // Hah
  0x062E: [0xFEA5, 0xFEA6, 0xFEA8, 0xFEA7], // Khah
  0x062F: [0xFEA9, 0xFEAA, 0xFEAA, 0xFEA9], // Dal
  0x0630: [0xFEAB, 0xFEAC, 0xFEAC, 0xFEAB], // Thal
  0x0631: [0xFEAD, 0xFEAE, 0xFEAE, 0xFEAD], // Reh
  0x0632: [0xFEAF, 0xFEB0, 0xFEB0, 0xFEAF], // Zain
  0x0633: [0xFEB1, 0xFEB2, 0xFEB4, 0xFEB3], // Seen
  0x0634: [0xFEB5, 0xFEB6, 0xFEB8, 0xFEB7], // Sheen
  0x0635: [0xFEB9, 0xFEBA, 0xFEBC, 0xFEBB], // Sad
  0x0636: [0xFEBD, 0xFEBE, 0xFEC0, 0xFEBF], // Dad
  0x0637: [0xFEC1, 0xFEC2, 0xFEC4, 0xFEC3], // Tah
  0x0638: [0xFEC5, 0xFEC6, 0xFEC8, 0xFEC7], // Zah
  0x0639: [0xFEC9, 0xFECA, 0xFECC, 0xFECB], // Ain
  0x063A: [0xFECD, 0xFECE, 0xFED0, 0xFECF], // Ghain
  0x0641: [0xFED1, 0xFED2, 0xFED4, 0xFED3], // Feh
  0x0642: [0xFED5, 0xFED6, 0xFED8, 0xFED7], // Qaf
  0x0643: [0xFED9, 0xFEDA, 0xFEDC, 0xFEDB], // Kaf
  0x0644: [0xFEDD, 0xFEDE, 0xFEE0, 0xFEDF], // Lam
  0x0645: [0xFEE1, 0xFEE2, 0xFEE4, 0xFEE3], // Meem
  0x0646: [0xFEE5, 0xFEE6, 0xFEE8, 0xFEE7], // Noon
  0x0647: [0xFEE9, 0xFEEA, 0xFEEC, 0xFEEB], // Heh
  0x0648: [0xFEED, 0xFEEE, 0xFEEE, 0xFEED], // Waw
  0x0649: [0xFEEF, 0xFEF0, 0xFEF0, 0xFEEF], // Alef Maksura
  0x064A: [0xFEF1, 0xFEF2, 0xFEF4, 0xFEF3], // Yeh
};

// Characters that do not connect to the following letter
const NON_JOINING = [
  0x0621, 0x0622, 0x0623, 0x0624, 0x0625, 0x0627, 0x062F, 0x0630, 0x0631, 0x0632, 0x0648, 0x0629, 0x0649
];

export function reshapeArabic(text) {
  if (!text) return '';
  
  // First handle Lam-Alif ligatures
  let str = String(text);
  str = str.replace(/لا/g, '\uFEF5');
  str = str.replace(/لأ/g, '\uFEF7');
  str = str.replace(/لإ/g, '\uFEF9');
  str = str.replace(/لآ/g, '\uFEFB');

  let result = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    const char = str[i];

    if (!ALPHABET[code]) {
      result.push(char);
      continue;
    }

    const prevCode = i > 0 ? str.charCodeAt(i - 1) : null;
    const nextCode = i < str.length - 1 ? str.charCodeAt(i + 1) : null;

    const canConnectPrev = prevCode && ALPHABET[prevCode] && !NON_JOINING.includes(prevCode);
    const canConnectNext = nextCode && ALPHABET[nextCode] && !NON_JOINING.includes(code);

    let formIndex = 0; // Isolated
    if (canConnectPrev && canConnectNext) {
      formIndex = 2; // Medial
    } else if (canConnectPrev) {
      formIndex = 1; // Final
    } else if (canConnectNext) {
      formIndex = 3; // Initial
    }

    result.push(String.fromCharCode(ALPHABET[code][formIndex]));
  }

  // After shaping, reverse words that contain Arabic characters to display right-to-left
  return reverseArabicWords(result.join(''));
}

function reverseArabicWords(text) {
  // A regex that matches consecutive Arabic characters (including presentation forms)
  const arabicRegex = /[\u0600-\u06FF\uFE70-\uFEFF]/;
  
  return text.split(' ').map(word => {
    if (arabicRegex.test(word)) {
      // Reverse Arabic word characters for RTL presentation
      return word.split('').reverse().join('');
    }
    return word;
  }).join(' ');
}
