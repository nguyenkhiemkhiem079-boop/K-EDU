(function () {
  const signature = value => String(value || '').normalize('NFC').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  const policy = {
    isApproved(q) {
      const c = q.curation;
      return String(q.level || '').toUpperCase() === 'VDC' && !!c && c.status === 'approved'
        && c.sourceType === 'specialized_school' && c.documentOriginVerified === true && c.difficultyReviewed === true && c.answerReviewed === true
        && typeof c.schoolName === 'string' && c.schoolName.trim().length > 0
        && Number.isInteger(c.sourcePage) && c.sourcePage > 0
        && typeof c.sourceEvidence === 'string' && c.sourceEvidence.trim().length > 0
        && typeof q.sourceFile === 'string' && q.sourceFile.toLowerCase().endsWith('.pdf')
        && c.sourceFile === q.sourceFile && c.questionId === q.id
        && c.questionSignature === signature(q.question)
        && c.answerSignature === signature(q.correctAnswer);
    },
    signature
  };
  if (typeof window !== 'undefined') window.SpecializedBankPolicy = policy;
  if (typeof module !== 'undefined' && module.exports) module.exports = policy;
})();
