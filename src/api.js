const API_URL = process.env.API_URL;

export async function getUserFragments(authenticatedUser) {
  const response = await fetch(`${API_URL}/v1/fragments`, {
    headers: {
      Authorization: `Bearer ${authenticatedUser.id_token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch fragments: ${response.status}`);
  }

  return response.json();
}