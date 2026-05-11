export const formatCLP = (amount) => {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
  }).format(amount);
};

export const generateCode = (prefix) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${result}`;
};

export const generateNumericCode = (length = 8) => {
  const chars = "0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const formatRut = (rut) => {
  if (!rut) return "";
  let cleanRut = rut.replace(/[^0-9kK]/g, "").toUpperCase();
  if (cleanRut.length === 0) return "";
  if (cleanRut.length > 9) cleanRut = cleanRut.slice(0, 9); // Max length of a chilean RUT without formatting is 9

  let result = cleanRut.slice(-1);
  let body = cleanRut.slice(0, -1);

  if (body.length > 0) {
    result = "-" + result;
    body = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    result = body + result;
  }

  return result;
};

export const cleanRut = (rut) => {
  if (!rut || rut === "Consumidor Final") return rut || "";
  return rut.replace(/[^0-9kK]/g, "").toUpperCase();
};
