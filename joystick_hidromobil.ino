// Hidromobil 36 — Arduino Nano joystick köprüsü
// Joystick modülü bağlantısı:
//   VRx -> A0    VRy -> A1    SW -> D2    +5V -> 5V    GND -> GND
// Seri çıktı (115200 baud), saniyede ~50 satır:  X,Y,BUTON   örn: 512,498,0
// X ve Y 0-1023 arası ham değer, BUTON basılıyken 1.
// Pinlerin farklıysa sadece aşağıdaki üç satırı değiştir.

const int PIN_X  = A0;
const int PIN_Y  = A1;
const int PIN_SW = 2;

void setup() {
  Serial.begin(115200);
  pinMode(PIN_SW, INPUT_PULLUP);   // buton GND'ye çekince LOW olur
}

void loop() {
  int x = analogRead(PIN_X);
  int y = analogRead(PIN_Y);
  int b = (digitalRead(PIN_SW) == LOW) ? 1 : 0;

  Serial.print(x);
  Serial.print(',');
  Serial.print(y);
  Serial.print(',');
  Serial.println(b);

  delay(20);
}
