/**
 * Mock email service for tests
 * Prevents console noise and allows testing email functionality
 */

export const sendVerificationEmail = jest.fn().mockResolvedValue(true);
export const sendPasswordResetEmail = jest.fn().mockResolvedValue(true);
export const sendWelcomeEmail = jest.fn().mockResolvedValue(true);
export const sendEmail = jest.fn().mockResolvedValue(true);

// Reset all mocks between tests
export const resetMocks = () => {
  sendVerificationEmail.mockClear();
  sendPasswordResetEmail.mockClear();
  sendWelcomeEmail.mockClear();
  sendEmail.mockClear();
};

export default {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendEmail,
  resetMocks,
};
