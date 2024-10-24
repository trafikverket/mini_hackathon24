using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.Xml.Linq;

namespace RoadConditionSample
{                                                   /* Program för att visa väglaget för olika regioner, baserat på deras regionkod. 
                                                     Kan användas för att planera sin rutt på morgonen, se vilka vägar som är säkra.
                                                     Önskan - Uppdatera i realtid (Tänk Google Maps när det är trafikarbete (gula/orangea vägar) */
    class Program
    {
        static async Task Main(string[] args)
        {
            using HttpClient httpClient = new HttpClient();

            // API URL
            Uri address = new Uri("https://api.trafikinfo.trafikverket.se/v2/data.xml");

            // XML-förfrågan för väglag i Dalarnas län
            string requestBody = "<REQUEST>" +
                                    "<LOGIN authenticationkey='8888e62eebf74cc9aa98fbb54fa4f96e'/>" +  // Ersätt med din autentiseringsnyckel
                                    "<QUERY objecttype='RoadCondition' schemaversion='1.2'>" +
                                        "<FILTER>" +
                                            "<EQ name='CountyNo' value='20'/>" +  // Dalarnas län, länskod 20 - Kan ersättas med andra länskoder.
                                        "</FILTER>" +
                                        "<INCLUDE>RoadNumber</INCLUDE>" +  // Inkluderar vägnummret
                                        "<INCLUDE>ConditionCode</INCLUDE>" +  /* Inkluderar väglagets 
                                                                               * kod 1(Normalt) 
                                                                               * Kod 2(Besvärligt -risk för)
                                                                               * Kod 3(Mycket besvärligt)
                                                                               * Kod 4(Is- och snövägbana)
                                                                               */
                                                                              
                                        "<INCLUDE>ConditionText</INCLUDE>" +  // Inkluderar väglagsbeskrivning - Textbeskrivning för Kod ovan.
                                    "</QUERY>" +
                                "</REQUEST>";

            var content = new StringContent(requestBody, Encoding.UTF8, "text/xml");
            var response = await httpClient.PostAsync(address, content);

            if (response.IsSuccessStatusCode)
            {
                string responseContent = await response.Content.ReadAsStringAsync();
                XDocument doc = XDocument.Parse(responseContent);

                // Loopa igenom varje väg och skriv ut vägnummret och väglaget.
                var roads = doc.Descendants("RoadCondition");
                foreach (var road in roads)
                {
                    var roadNumber = road.Element("RoadNumber")?.Value;
                    var conditionCode = road.Element("ConditionCode")?.Value;
                    var conditionText = road.Element("ConditionText")?.Value;

                    Console.WriteLine($"Väg: {roadNumber}, Väglag: {conditionText} (Kod: {conditionCode})");
                }
            }
            else
            {
                Console.WriteLine($"Fel: {response.StatusCode} - {response.ReasonPhrase}");
            }
        }
    }
}
