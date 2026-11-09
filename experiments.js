/* Experiment definitions taken from the MVJ22CS71 IoT Lab Manual (experiments 1 - 10).
   comps: parts on the table. wires: required connections (used for Mission checks / Hint / Auto-wire).
   opt: optional extra connections. Terminal ids: ard:<pin>, ard:A0.., ard:5V, ard:GND, <compId>.<pin> */
(function (G) {
const E = [];
const add = e => E.push(e);

add({id:'1', title:'1 · DEMO – LED blinking (with buzzer)',
  aim:'Blink an LED on pin 7 with a 1 s duty cycle; the buzzer beeps along with it.',
  hw:['Arduino Uno', 'LED', 'Buzzer'],
  comps:[{type:'led', id:'led1', color:'red', label:'LED'}, {type:'buzzer', id:'bz', label:'Buzzer'}],
  wires:[['ard:7','led1.a'],['led1.k','ard:GND'],['ard:7','bz.p'],['bz.n','ard:GND']],
  code:`void setup() {
  // put your setup code here, to run once:
  pinMode(7, OUTPUT); // initialize the digital pin as an output.
}
void loop() {
  // put your main code here, to run repeatedly:
  digitalWrite(7, HIGH); // turn the LED on (HIGH is the voltage level)
  delay(1000);           // wait for a second
  digitalWrite(7, LOW);  // turn the LED off by making the voltage LOW
  delay(1000);           // wait for a second
}`});

add({id:'1A', title:'1 (A) · Two LEDs blinking alternately',
  aim:'Blink 2 LEDs back and forth alternately at a given duty cycle.',
  hw:['Arduino Uno', 'LED ×2'],
  comps:[{type:'led', id:'led1', color:'red', label:'LED 1'}, {type:'led', id:'led2', color:'green', label:'LED 2'}],
  wires:[['ard:6','led1.a'],['led1.k','ard:GND'],['ard:7','led2.a'],['led2.k','ard:GND']],
  code:`void setup() {
  pinMode(6, OUTPUT);
  pinMode(7, OUTPUT);
}
void loop() {
  digitalWrite(6, HIGH);
  digitalWrite(7, LOW);
  delay(500);
  digitalWrite(7, HIGH);
  digitalWrite(6, LOW);
  delay(500);
}`});

add({id:'1B', title:'1 (B) · LED ON/OFF with micro-switch + Serial Monitor',
  aim:'Turn an LED ON/OFF using a micro-switch and print the LED status (1/0) on the Serial Monitor. Hold the switch with your mouse.',
  hw:['Arduino Uno', 'LED', 'Micro-switch', '10K resistor (pull-down)'],
  comps:[{type:'led', id:'led1', color:'red', label:'LED'}, {type:'switch', id:'sw', label:'Micro-switch'}, {type:'resistor', id:'r1', ohms:10000, label:'10K'}],
  wires:[['ard:7','led1.a'],['led1.k','ard:GND'],['ard:5V','sw.a'],['sw.b','ard:5'],['sw.b','r1.a'],['r1.b','ard:GND']],
  code:`#define LED_PIN 7
#define MICROSWITCH_PIN 5
void setup() {
  pinMode(LED_PIN, OUTPUT);
  pinMode(MICROSWITCH_PIN, INPUT);
  Serial.begin(9600);
}
void loop() {
  if (digitalRead(MICROSWITCH_PIN) == HIGH) {
    digitalWrite(LED_PIN, HIGH);
    Serial.println(1);
  }
  else {
    digitalWrite(LED_PIN, LOW);
    Serial.println(0);
  }
}`});

add({id:'1C', title:'1 (C) · LED ON/OFF only through Serial Monitor',
  aim:'Type 1 in the Serial Monitor to turn the LED ON and 2 to turn it OFF (no switch).',
  hw:['Arduino Uno', 'LED'],
  comps:[{type:'led', id:'led1', color:'red', label:'LED'}],
  wires:[['ard:7','led1.a'],['led1.k','ard:GND']],
  code:`void setup()
{
  pinMode(7, OUTPUT);
  Serial.begin(9600);
  while (!Serial);
  Serial.println("Input 1 to Turn LED on and 2 to off");
}
void loop() {
  if (Serial.available())
  {
    int state = Serial.parseInt();
    if (state == 1)
    {
      digitalWrite(7, HIGH);
      Serial.println("Command completed LED turned ON");
    }
    if (state == 2)
    {
      digitalWrite(7, LOW);
      Serial.println("Command completed LED turned OFF");
    }
  }
}`});

add({id:'2A', title:'2 (A) · Auto fading of LED brightness through PWM',
  aim:'Fade an LED up and down using analogWrite() on PWM pin 9.',
  hw:['Arduino Uno', 'LED'],
  comps:[{type:'led', id:'led1', color:'green', label:'LED'}],
  wires:[['ard:9','led1.a'],['led1.k','ard:GND']],
  code:`int led = 9;
int brightness = 0;
int fadeAmount = 5;
void setup() {
  // put your setup code here, to run once:
  pinMode(led, OUTPUT);
}
void loop() {
  // put your main code here, to run repeatedly:
  analogWrite(led, brightness);
  brightness = brightness + fadeAmount;
  if (brightness == 0 || brightness == 125) {
    fadeAmount = -fadeAmount;
  }
  delay(200);
}`});

add({id:'2B', title:'2 (B) · LED fading using Potentiometer',
  aim:'Control the brightness of an LED with a potentiometer and show the value on the Serial Monitor. Turn the knob with your mouse.',
  hw:['Arduino Uno', 'LED', 'Potentiometer', '220 Ω resistor'],
  comps:[{type:'led', id:'led1', color:'yellow', label:'LED'}, {type:'pot', id:'pot', label:'Potentiometer'}, {type:'resistor', id:'r1', ohms:220, label:'220 Ω'}],
  wires:[['pot.p1','ard:GND'],['pot.p3','ard:5V'],['pot.w','ard:A0'],['ard:9','r1.a'],['r1.b','led1.a'],['led1.k','ard:GND']],
  code:`int potPin = A0;
int gPin = 9;
int potVal;
float LEDVal;
void setup() {
  pinMode(potPin, INPUT);
  pinMode(gPin, OUTPUT);
  Serial.begin(9600);
}
void loop() {
  potVal = analogRead(potPin);
  LEDVal = (255. / 1023.) * potVal;
  analogWrite(gPin, LEDVal);
  delay(500);
  Serial.println(LEDVal);
}`});

add({id:'3A', title:'3 (A) · Traffic light simulation',
  aim:'Red 4.5 s → Yellow 2 s → Green 2.8 s using three LEDs and 220 Ω resistors.',
  hw:['Arduino Uno', 'LED ×3 (R, Y, G)', '220 Ω resistor ×3', 'Breadboard'],
  comps:[{type:'led', id:'ledR', color:'red', label:'RED'}, {type:'led', id:'ledY', color:'yellow', label:'YELLOW'}, {type:'led', id:'ledG', color:'green', label:'GREEN'},
         {type:'resistor', id:'r1', ohms:220, label:'220 Ω'}, {type:'resistor', id:'r2', ohms:220, label:'220 Ω'}, {type:'resistor', id:'r3', ohms:220, label:'220 Ω'}],
  wires:[['ard:5','r1.a'],['r1.b','ledR.a'],['ledR.k','ard:GND'],['ard:6','r2.a'],['r2.b','ledY.a'],['ledY.k','ard:GND'],['ard:7','r3.a'],['r3.b','ledG.a'],['ledG.k','ard:GND']],
  code:`void setup() {
  // put your setup code here, to run once:
  pinMode(5, OUTPUT);
  pinMode(6, OUTPUT);
  pinMode(7, OUTPUT);
}
void loop() {
  // put your main code here, to run repeatedly:
  digitalWrite(5, HIGH);
  digitalWrite(6, LOW);
  digitalWrite(7, LOW);
  delay(4500);
  digitalWrite(5, LOW);
  digitalWrite(6, HIGH);
  digitalWrite(7, LOW);
  delay(2000);
  digitalWrite(5, LOW);
  digitalWrite(6, LOW);
  digitalWrite(7, HIGH);
  delay(2800);
}`});

add({id:'3B', title:'3 (B) · 4-LED chasing pattern back and forth',
  aim:'Light 4 LEDs one after another and switch them off in reverse order.',
  hw:['Arduino Uno', 'LED ×4'],
  comps:[{type:'led', id:'led1', color:'red', label:'D4'}, {type:'led', id:'led2', color:'yellow', label:'D5'}, {type:'led', id:'led3', color:'green', label:'D6'}, {type:'led', id:'led4', color:'blue', label:'D7'}],
  wires:[['ard:4','led1.a'],['led1.k','ard:GND'],['ard:5','led2.a'],['led2.k','ard:GND'],['ard:6','led3.a'],['led3.k','ard:GND'],['ard:7','led4.a'],['led4.k','ard:GND']],
  code:`void setup() {
  // put your setup code here, to run once:
  pinMode(4, OUTPUT);
  pinMode(5, OUTPUT);
  pinMode(6, OUTPUT);
  pinMode(7, OUTPUT);
}
void loop() {
  // put your main code here, to run repeatedly:
  digitalWrite(4, HIGH);
  delay(100);
  digitalWrite(5, HIGH);
  delay(100);
  digitalWrite(6, HIGH);
  delay(100);
  digitalWrite(7, HIGH);
  delay(100);
  digitalWrite(7, LOW);
  delay(100);
  digitalWrite(6, LOW);
  delay(100);
  digitalWrite(5, LOW);
  delay(100);
  digitalWrite(4, LOW);
  delay(100);
}`});

add({id:'3C', title:'3 (C) · UP/DOWN decade counter (4-bit binary LEDs)',
  aim:'Count 1 → 9 then back 9 → 1 on four LEDs (D2 = 1, D3 = 2, D4 = 4, D5 = 8).',
  hw:['Arduino Uno', 'LED ×4'],
  comps:[{type:'led', id:'led1', color:'red', label:'D2  (1)'}, {type:'led', id:'led2', color:'yellow', label:'D3  (2)'}, {type:'led', id:'led3', color:'green', label:'D4  (4)'}, {type:'led', id:'led4', color:'blue', label:'D5  (8)'}],
  wires:[['ard:2','led1.a'],['led1.k','ard:GND'],['ard:3','led2.a'],['led2.k','ard:GND'],['ard:4','led3.a'],['led3.k','ard:GND'],['ard:5','led4.a'],['led4.k','ard:GND']],
  code:`void setup() {
  pinMode(2, OUTPUT);
  pinMode(3, OUTPUT);
  pinMode(4, OUTPUT);
  pinMode(5, OUTPUT);
}
void loop() {
  digitalWrite(2, HIGH);
  delay(1000);
  //Number 2
  digitalWrite(2, LOW);
  digitalWrite(3, HIGH);
  delay(1000);
  //Number 3
  digitalWrite(3, HIGH);
  digitalWrite(2, HIGH);
  delay(1000);
  // Number 4
  digitalWrite(2, LOW);
  digitalWrite(3, LOW);
  digitalWrite(4, HIGH);
  delay(1000);
  //Number 5
  digitalWrite(2, HIGH);
  digitalWrite(3, LOW);
  digitalWrite(4, HIGH);
  delay(1000);
  //Number 6
  digitalWrite(2, LOW);
  digitalWrite(3, HIGH);
  digitalWrite(4, HIGH);
  delay(1000);
  // Number 7
  digitalWrite(2, HIGH);
  digitalWrite(3, HIGH);
  digitalWrite(4, HIGH);
  delay(1000);
  // Number 8
  digitalWrite(2, LOW);
  digitalWrite(3, LOW);
  digitalWrite(4, LOW);
  digitalWrite(5, HIGH);
  delay(1000);
  // Number 9
  digitalWrite(2, HIGH);
  digitalWrite(3, LOW);
  digitalWrite(4, LOW);
  digitalWrite(5, HIGH);
  delay(1000);
  //RESET
  digitalWrite(2, LOW);
  digitalWrite(3, LOW);
  digitalWrite(4, LOW);
  digitalWrite(5, LOW);
  delay(1000);
  // ---- counting DOWN ----
  // Number 9
  digitalWrite(2, HIGH);
  digitalWrite(3, LOW);
  digitalWrite(4, LOW);
  digitalWrite(5, HIGH);
  delay(1000);
  // Number 8
  digitalWrite(2, LOW);
  digitalWrite(3, LOW);
  digitalWrite(4, LOW);
  digitalWrite(5, HIGH);
  delay(1000);
  // Number 7
  digitalWrite(2, HIGH);
  digitalWrite(3, HIGH);
  digitalWrite(4, HIGH);
  digitalWrite(5, LOW);
  delay(1000);
  //Number 6
  digitalWrite(2, LOW);
  digitalWrite(3, HIGH);
  digitalWrite(4, HIGH);
  delay(1000);
  //Number 5
  digitalWrite(2, HIGH);
  digitalWrite(3, LOW);
  digitalWrite(4, HIGH);
  delay(1000);
  // Number 4
  digitalWrite(2, LOW);
  digitalWrite(3, LOW);
  digitalWrite(4, HIGH);
  delay(1000);
  //Number 3
  digitalWrite(3, HIGH);
  digitalWrite(2, HIGH);
  digitalWrite(4, LOW);
  delay(1000);
  //Number 2
  digitalWrite(2, LOW);
  digitalWrite(3, HIGH);
  delay(1000);
  //Number 1
  digitalWrite(2, HIGH);
  digitalWrite(3, LOW);
  delay(1000);
  //RESET
  digitalWrite(2, LOW);
  digitalWrite(3, LOW);
  digitalWrite(4, LOW);
  digitalWrite(5, LOW);
  delay(1000);
}`});

add({id:'4', title:'4 · Obstacle detector – IR module + LED + buzzer',
  aim:'Detect an obstacle with the IR module (A0 < 260) → red LED + buzzer alarm. Drag the "Obstacle distance" slider in Controls.',
  hw:['Arduino Uno', 'IR obstacle module', 'LED ×2', 'Buzzer'],
  comps:[{type:'ir', id:'ir', label:'IR module'}, {type:'led', id:'ledR', color:'red', label:'ALERT (D5)'}, {type:'led', id:'ledG', color:'green', label:'CLEAR (D7)'}, {type:'buzzer', id:'bz', label:'Buzzer'}],
  wires:[['ir.vcc','ard:5V'],['ir.gnd','ard:GND'],['ir.out','ard:A0'],['ard:5','ledR.a'],['ledR.k','ard:GND'],['ard:7','ledG.a'],['ledG.k','ard:GND'],['ard:5','bz.p'],['bz.n','ard:GND']],
  code:`void setup()
{
  Serial.begin(9600);
  pinMode(5, OUTPUT);
  pinMode(7, OUTPUT);
}
void loop()
{
  int v = analogRead(A0); // v means value
  Serial.println(v);
  delay(300);
  if (v < 260)
  {
    digitalWrite(7, LOW);
    digitalWrite(5, HIGH);
    delay(300);
    Serial.println("MOTION DETECTED");
    digitalWrite(5, LOW);
  }
  else
  {
    digitalWrite(5, LOW);
    digitalWrite(7, HIGH);
  }
}`});

add({id:'5', title:'5 · Lamp control with LDR (light sensor) + relay',
  aim:'LED/lamp turns ON when it gets dark (A0 ≥ 400). Wire the 10K to 5V and the LDR to GND so the reading rises in the dark. Use the Light slider.',
  hw:['Arduino Uno', 'LDR', '10K resistor', 'LED', 'Relay module', 'Lamp'],
  comps:[{type:'ldr', id:'ldr', label:'LDR'}, {type:'resistor', id:'r1', ohms:10000, label:'10K'}, {type:'led', id:'led1', color:'yellow', label:'LED (D8)'},
         {type:'relay', id:'rl', label:'Relay'}, {type:'lamp', id:'lamp', label:'Lamp'}],
  wires:[['ard:5V','r1.a'],['r1.b','ard:A0'],['ard:A0','ldr.a'],['ldr.b','ard:GND'],['ard:8','led1.a'],['led1.k','ard:GND'],
         ['rl.vcc','ard:5V'],['rl.gnd','ard:GND'],['rl.in','ard:8'],['rl.com','ard:5V'],['rl.no','lamp.a'],['lamp.b','ard:GND']],
  code:`void setup()
{
  pinMode(8, OUTPUT);
  Serial.begin(9600);
}
void loop()
{
  int a = analogRead(A0);
  Serial.println(a);
  if (a >= 400)
  {
    digitalWrite(8, HIGH);
    Serial.println("CLOUDY/EVENING SUN HAS SET");
  }
  else
  {
    digitalWrite(8, LOW);
    Serial.println("ENOUGH LIGHT/DAY TIME ");
  }
  delay(1000);
}`});

add({id:'6', title:'6 · Ultrasonic distance meter + reverse-parking alarm',
  aim:'HC-SR04 measures distance; closer than 50 cm the buzzer/LED beeps faster. Use the Distance slider.',
  hw:['Arduino Uno', 'HC-SR04 ultrasonic sensor', 'Buzzer', 'LED'],
  comps:[{type:'ultra', id:'us', label:'HC-SR04'}, {type:'buzzer', id:'bz', label:'Buzzer'}, {type:'led', id:'led1', color:'red', label:'Warning LED'}],
  wires:[['us.vcc','ard:5V'],['us.trig','ard:6'],['us.echo','ard:5'],['us.gnd','ard:GND'],['bz.p','ard:2'],['bz.n','ard:GND'],['led1.a','ard:2'],['led1.k','ard:GND']],
  code:`const int trigPin = 6; //configuration of ultrasonic sensor VCC TRIG ECHO GND
const int echoPin = 5;
const int buzzer = 2;
float new_delay;
long duration;
int distance;
void setup()
{
  // put your setup code here, to run once:
  Serial.begin(9600);
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  pinMode(buzzer, OUTPUT);
}
void loop() {
  digitalWrite(trigPin, LOW);  // put your main code here, to run repeatedly:
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(12);
  digitalWrite(trigPin, LOW);
  duration = pulseIn(echoPin, HIGH);
  distance = duration * 0.034 / 2;
  Serial.print("Distance: ");
  new_delay = (distance * 3) + 30;
  Serial.print(distance);
  Serial.println("    cm");
  if (distance < 50)
  {
    digitalWrite(buzzer, HIGH);
    delay(new_delay);
    digitalWrite(buzzer, LOW);
  }
  else
  {
    digitalWrite(buzzer, LOW);
  }
  delay(200);
}`});

add({id:'7', title:'7 · Smoke detection – visual indication + buzzer alarm',
  aim:'MQ-2 smoke sensor on A0: value > 250 → red LED + buzzer, otherwise the green LED stays on. Use the Smoke slider.',
  hw:['Arduino Uno', 'MQ-2 smoke sensor module', 'LED ×2', 'Buzzer'],
  comps:[{type:'smoke', id:'mq', label:'MQ-2 Smoke'}, {type:'led', id:'ledG', color:'green', label:'SAFE (D11)'}, {type:'led', id:'ledR', color:'red', label:'ALARM (D12)'}, {type:'buzzer', id:'bz', label:'Buzzer'}],
  wires:[['mq.vcc','ard:5V'],['mq.gnd','ard:GND'],['mq.ao','ard:A0'],['ard:11','ledG.a'],['ledG.k','ard:GND'],['ard:12','ledR.a'],['ledR.k','ard:GND'],['ard:12','bz.p'],['bz.n','ard:GND']],
  code:`int smoke;
void setup() {
  // put your setup code here, to run once:
  pinMode(11, OUTPUT);
  pinMode(12, OUTPUT);
  Serial.begin(9600);
}
void loop() {
  // put your main code here, to run repeatedly:
  smoke = analogRead(A0);
  Serial.println("Smoke Sensor");
  Serial.println(smoke);
  delay(1000);
  if (smoke > 250)
  {
    digitalWrite(11, LOW);
    digitalWrite(12, HIGH);
    delay(1000);
    digitalWrite(12, LOW);
    Serial.println("SMOKE DETECTED ");
  }
  else
  {
    digitalWrite(11, HIGH);
    digitalWrite(12, LOW);
    Serial.println("NO SMOKE  ");
  }
}`});

add({id:'8', title:'8 · Name / USN / College on I2C LCD',
  aim:'Display your NAME, USN, college and department on the 16×2 I2C LCD (SDA = A4, SCL = A5).',
  hw:['Arduino Uno', '16×2 LCD with I2C backpack'],
  comps:[{type:'lcd', id:'lcd', label:'16×2 I2C LCD'}],
  wires:[['lcd.gnd','ard:GND'],['lcd.vcc','ard:5V'],['lcd.sda','ard:A4'],['lcd.scl','ard:A5']],
  code:`#include <Wire.h>
#include <LiquidCrystal_I2C.h>
LiquidCrystal_I2C lcd(0x27, 16, 2); // SDA = A4 SCL = A5
void setup() {
  Serial.begin(9600);
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("JACOB S E");
  lcd.setCursor(0, 1);
  lcd.print("1MJ22CS014 MVJ");
}
void loop() {
  delay(300);
}`});

add({id:'8A', title:'8 (A) · POT value & angle on LCD + Serial Monitor',
  aim:'Read the potentiometer, convert to angle (0–315°) and show it on the LCD and Serial Monitor. Turn the knob with your mouse.',
  hw:['Arduino Uno', '16×2 I2C LCD', 'Potentiometer'],
  comps:[{type:'lcd', id:'lcd', label:'16×2 I2C LCD'}, {type:'pot', id:'pot', label:'Potentiometer'}],
  wires:[['lcd.gnd','ard:GND'],['lcd.vcc','ard:5V'],['lcd.sda','ard:A4'],['lcd.scl','ard:A5'],['pot.p1','ard:GND'],['pot.p3','ard:5V'],['pot.w','ard:A0']],
  code:`#include <Wire.h>
#include <LiquidCrystal_I2C.h>
// Initialize the LCD with the I2C address (usually 0x27) and size (16x2)
LiquidCrystal_I2C lcd(0x27, 16, 2);
int potValue; // Variable to store potentiometer reading
float angle;  // Variable to store calculated angle in degrees
void setup() {
  Serial.begin(9600); // Start serial communication
  lcd.init();         // Initialize the LCD
  lcd.backlight();    // Turn on the backlight
}
void loop() {
  potValue = analogRead(A0); // Read potentiometer value
  // Convert potentiometer value to angle (0 to 315 degrees) with higher precision
  angle = (float)potValue * 315.0 / 1023.0;
  // Display on Serial Monitor
  Serial.print("Potentiometer value: ");
  Serial.println(potValue);
  Serial.print("Angle: ");
  Serial.print(angle);
  Serial.println(" degrees");
  // Display on LCD
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Pot Val:");
  lcd.print(potValue);
  lcd.setCursor(0, 1);
  lcd.print("Angle:");
  lcd.print(angle, 1); // Show 1 decimal place
  lcd.print((char)223); // Degree symbol
  delay(500); // Wait for half a second
}`});

add({id:'9', title:'9 · Temperature & Humidity (DHT11) on I2C LCD',
  aim:'Read the DHT11 on pin 8 and show temperature and humidity on the I2C LCD. Use the Temp / Humidity sliders.',
  hw:['Arduino Uno', 'DHT11 module', '16×2 I2C LCD'],
  comps:[{type:'dht', id:'dht', label:'DHT11'}, {type:'lcd', id:'lcd', label:'16×2 I2C LCD'}],
  wires:[['dht.vcc','ard:5V'],['dht.data','ard:8'],['dht.gnd','ard:GND'],['lcd.gnd','ard:GND'],['lcd.vcc','ard:5V'],['lcd.sda','ard:A4'],['lcd.scl','ard:A5']],
  code:`#include <DHT.h>;//INSTALL DHT sensor library by Adafruit 1.4.6
#include <LiquidCrystal_I2C.h>
#include <Wire.h>
LiquidCrystal_I2C lcd(0x27, 16, 2); // SDA = A4 SCL = A5
//Constants
#define DHTPIN 8     // what pin we're connected to
#define DHTTYPE DHT11   // DHT 11
DHT dht(DHTPIN, DHTTYPE);
//Variables
int h;  //Stores humidity value
int t;  //Stores temperature value
void setup()
{
  Serial.begin(9600);
  Serial.println("Temperature and Humidity Sensor Test");
  dht.begin();
  lcd.init();      //initialize the lcd
  lcd.backlight(); //open the backlight
}
void loop()
{
  //Read data and store it to variables h (humidity) and t (temperature)
  h = dht.readHumidity();
  t = dht.readTemperature();
  //Print temp and humidity values to serial monitor
  Serial.print("Humidity: ");
  Serial.print(h);
  Serial.print(" %, Temp: ");
  Serial.print(t);
  Serial.println(" Celsius");
  lcd.setCursor(0, 0);
  lcd.print(" Now Temperature ");
  lcd.setCursor(0, 1);
  lcd.print("T:");
  lcd.print(t);
  lcd.print("C");
  lcd.setCursor(6, 1);
  lcd.print("2026 ");
  lcd.setCursor(11, 1);
  lcd.print("H:");
  lcd.print(h);
  lcd.print("%");
  delay(1000); //Delay 1 sec.
}`});

add({id:'10', title:'10 · Smart garden – soil moisture & automatic sprinkler',
  aim:'Soil sensor on A0 → 3 LEDs: DRY (red D2), MOIST (yellow D3), FULLY WET (green D4). Optional: drive the water pump when dry. Use the Soil moisture slider.',
  hw:['Arduino Uno', 'Soil moisture sensor', 'LED ×3', 'DC water pump / motor', 'Breadboard'],
  comps:[{type:'soil', id:'soil', label:'Soil sensor'}, {type:'led', id:'ledR', color:'red', label:'DRY (D2)'}, {type:'led', id:'ledY', color:'yellow', label:'MOIST (D3)'}, {type:'led', id:'ledG', color:'green', label:'WET (D4)'},
         {type:'motor', id:'mt', label:'Water pump'}],
  wires:[['soil.vcc','ard:5V'],['soil.gnd','ard:GND'],['soil.ao','ard:A0'],['ard:2','ledR.a'],['ledR.k','ard:GND'],['ard:3','ledY.a'],['ledY.k','ard:GND'],['ard:4','ledG.a'],['ledG.k','ard:GND']],
  opt:[['ard:8','mt.p'],['mt.n','ard:GND']],
  code:`int sensor_pin = A0; // PIN CONFIGURATION OF SOIL SENSOR A0 D0 GND VCC
void setup() {
  // put your setup code here, to run once:
  Serial.begin(9600);
  pinMode(sensor_pin, INPUT);
  pinMode(2, OUTPUT);
  pinMode(3, OUTPUT);
  pinMode(4, OUTPUT);
  pinMode(8, OUTPUT);   // water pump (optional, wire it to D8)
}
void loop() {
  // put your main code here, to run repeatedly:
  int sensor_data = analogRead(sensor_pin);
  Serial.println(sensor_data);
  if (sensor_data >= 1000)
  {
    digitalWrite(2, HIGH);
    digitalWrite(3, LOW);
    digitalWrite(4, LOW);
    digitalWrite(8, HIGH);   // sprinkle!
    Serial.println("No moisture Soil is dry");
    delay(1000);
  }
  else if (sensor_data <= 700 && sensor_data >= 630)
  {
    digitalWrite(2, LOW);
    digitalWrite(3, HIGH);
    digitalWrite(4, LOW);
    digitalWrite(8, LOW);
    Serial.println("There is some moisture, Soil is medium");
    delay(1000);
  }
  else if (sensor_data <= 600)
  {
    digitalWrite(2, LOW);
    digitalWrite(3, LOW);
    digitalWrite(4, HIGH);
    digitalWrite(8, LOW);
    Serial.println("Soil is wet");
    delay(1000);
  }
}`});

G.EXPS = E;
if (typeof module !== 'undefined') module.exports = E;
})(typeof window !== 'undefined' ? window : globalThis);
