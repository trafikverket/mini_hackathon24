using System;
using System.Net.Http;
using System.Threading.Tasks;
using System.Xml.Linq;
using System.IO;
using System.Drawing;  // Lagt till för att använda System.Drawing

class Program
{
    static async Task Main(string[] args)
    {
        Console.WriteLine("--- Kontrollera Trafikverkets kamerastatus och bilder ---");

        string authenticationKey = "0cf3bbe57700490ca15402107f125e84";  // Ange din autentiseringsnyckel här
        string requestBody = $@"
            <REQUEST>
                <LOGIN authenticationkey='{authenticationKey}' />
                <QUERY objecttype='Camera' schemaversion='1' limit='1000'>
                </QUERY>
            </REQUEST>";

        string url = "https://api.trafikinfo.trafikverket.se/v2/data.xml";

        using (HttpClient client = new HttpClient())
        {
            try
            {
                // Skicka förfrågan till Trafikverkets API
                HttpContent content = new StringContent(requestBody);
                content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/xml");

                HttpResponseMessage response = await client.PostAsync(url, content);

                if (response.IsSuccessStatusCode)
                {
                    string responseString = await response.Content.ReadAsStringAsync();
                    ProcessCameraData(responseString);
                }
                else
                {
                    Console.WriteLine("Fel vid hämtning av kameradata: " + response.ReasonPhrase);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("Ett fel uppstod: " + ex.Message);
            }
        }
    }

    private static void ProcessCameraData(string xml)
    {
        // Läsa XML och extrahera relevant information
        XDocument doc = XDocument.Parse(xml);

        // Hämta alla kameror från resultatet
        var cameras = doc.Descendants("Camera");

        foreach (var camera in cameras)
        {
            string cameraName = camera.Element("Name")?.Value;
            string photoUrl = camera.Element("PhotoUrl")?.Value;
            string status = camera.Element("Status")?.Value;

            if (status == "videoOrImagesUnavailableDueToCameraFault")
            {
                Console.WriteLine($"Kamera: {cameraName}");
                Console.WriteLine("Status: INAKTIV - video eller bilder är ej tillgängliga på grund av kamerafel.");
            }
            else
            {
                if (!string.IsNullOrEmpty(photoUrl))
                {
                    // Kolla om bilden går att hämta
                    if (!IsImageAvailable(photoUrl).Result)
                    {
                        Console.WriteLine($"Kamera: {cameraName}");
                        Console.WriteLine("Bilden är INTE tillgänglig.");
                    }
                    else if (IsImageBlack(photoUrl).Result)
                    {
                        Console.WriteLine($"Kamera: {cameraName}");
                        Console.WriteLine("Bilden är svart och visar inget användbart.");
                    }
                    else
                    {
                        // Om kameran är aktiv, bilden är tillgänglig, och bilden inte är svart - skriv inte ut något
                        continue;
                    }
                }
                else
                {
                    Console.WriteLine($"Kamera: {cameraName}");
                    Console.WriteLine("Ingen bild tillgänglig.");
                }
            }
            Console.WriteLine("------------------------------------");
        }
    }

    private static async Task<bool> IsImageAvailable(string url)
    {
        using (HttpClient client = new HttpClient())
        {
            try
            {
                HttpResponseMessage response = await client.GetAsync(url);
                return response.IsSuccessStatusCode;
            }
            catch
            {
                // Om vi får ett fel så antar vi att bilden inte är tillgänglig
                return false;
            }
        }
    }

    private static async Task<bool> IsImageBlack(string imageUrl)
    {
        using (HttpClient client = new HttpClient())
        {
            try
            {
                // Ladda ner bilden som en byte array
                byte[] imageBytes = await client.GetByteArrayAsync(imageUrl);

                // Kontrollera om alla bytes är noll (svart bild)
                foreach (byte b in imageBytes)
                {
                    if (b != 0)
                    {
                        // Om vi hittar en byte som inte är noll, är bilden inte helt svart
                        return false;
                    }
                }
                // Om alla bytes är noll, är bilden svart
                return true;
            }
            catch
            {
                Console.WriteLine("Fel vid kontroll av bildens färg.");
                return false;
            }
        }
    }
}
