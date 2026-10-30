// Temporary passwords that the Admin gives to a person
// (reset password today; the add forms can use it later too).
//
// Shape: Abc-4def-g7 (11 characters, the backend needs 8 to 100).
// It always has an upper-case letter, a lower-case letter and a digit,
// and leaves out the characters that are easy to confuse when read aloud
// or written on paper: 0 O o, 1 l I i.


const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghjkmnpqrstuvwxyz';
const DIGITS = '23456789';
const ALL = UPPER + LOWER + DIGITS;


export const TEMP_PASSWORD_MIN_LENGTH = 8;
export const TEMP_PASSWORD_MAX_LENGTH = 100;


export function generateTempPassword(): string {

  return (
    pick(UPPER) + pick(ALL) + pick(ALL) +
    '-' +
    pick(DIGITS) + pick(ALL) + pick(ALL) + pick(ALL) +
    '-' +
    pick(LOWER) + pick(DIGITS)
  );
}


// One random character of the set.
// crypto.getRandomValues instead of Math.random: this is a password.
function pick(characters: string): string {

  const random = new Uint32Array(1);

  crypto.getRandomValues(random);

  return characters[random[0] % characters.length];
}
