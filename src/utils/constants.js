export const BLOOD_TYPES = [
  'A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE',
  'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE'
];

export const formatBloodType = (type) => {
  if (!type) return 'N/A';
  return type.replace('_', ' ').replace('POSITIVE', '+').replace('NEGATIVE', '-');
};

export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};
