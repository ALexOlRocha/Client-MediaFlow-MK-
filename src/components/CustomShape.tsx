export default function CustomShape() {
  return (
    <div className="relative w-[500px] h-[200px]">
      <div
        className="w-[500px] h-[300px] bg-blue-600"
        style={{
          clipPath:
            "path('M 20,0 L 480,0 A 20,20 0,0,1 500,20 L 500,200 A 20,20 0,0,1  480,220 L 350,220 A 20,20 0,0,0 330,240 L 330,280 A 20,20 0,0,1 310,300 L 20,300 A 20,20 0,0,1 0,280 L 0,20 A 20,20 0,0,1 20,0 Z')",
        }}
      />

      <div className="absolute w-[145px] h-[65px] rounded-[18px] bg-black top-[240px] left-[352px]" />
    </div>
  );
}
