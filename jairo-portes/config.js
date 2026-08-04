window.EBROMOVE_CONFIG = {
  bookingApiUrl: "",
  bookingApiUseJsonp: true,
  bookingToken: "",
  calendarUrl: "",
  whatsappPhone: "41794530967",
  publicSiteUrl: "https://ebrostay.github.io/ebrostay-website-minimal/jairo-portes/"
};

window.addEventListener("load", function () {
  if (document.querySelector('script[src*="booking-bot-bridge.js"]')) return;
  var script = document.createElement("script");
  script.src = "booking-bot-bridge.js?v=whatsapp-bot-flow";
  document.body.append(script);
});
