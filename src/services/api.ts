export async function fetchSpreadsheetData() {
  const url = 'https://script.google.com/macros/s/AKfycbziJpLBjUj40kRFXrLEL0750eXVY8vxobzwQCH7rrBH3xMv_YDKpeNpfJPfc5qRQk6n/exec';
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Erro na rede: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Erro ao carregar os dados:", error);
    throw error;
  }
}
