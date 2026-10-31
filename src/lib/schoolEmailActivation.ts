export const isSchoolEmailActivationEntry = (view: string | null, token: string | null): boolean => (
    view === 'student_verification' && Boolean(token?.trim())
);
