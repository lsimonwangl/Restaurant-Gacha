// Mock uuid v7 for Jest tests with random values to avoid DB collisions
module.exports = {
  v7: () => {
    // Generate a pseudo-random UUID v7-like string
    // Format: 8-4-4-4-12 hex digits
    const part1 = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
    const part2 = Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0');
    const part3 = '7' + Math.floor(Math.random() * 0xfff).toString(16).padStart(3, '0'); // version 7
    const part4 = (Math.floor(Math.random() * 0x3fff) | 0x8000).toString(16).padStart(4, '0'); // variant
    const part5 = Math.floor(Math.random() * 0xffffffffffff).toString(16).padStart(12, '0');
    return `${part1}-${part2}-${part3}-${part4}-${part5}`;
  },
  v4: () => {
    const part1 = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
    const part2 = Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0');
    const part3 = '4' + Math.floor(Math.random() * 0xfff).toString(16).padStart(3, '0');
    const part4 = (Math.floor(Math.random() * 0x3fff) | 0x8000).toString(16).padStart(4, '0');
    const part5 = Math.floor(Math.random() * 0xffffffffffff).toString(16).padStart(12, '0');
    return `${part1}-${part2}-${part3}-${part4}-${part5}`;
  }
};
