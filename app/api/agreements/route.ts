import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "This form has been retired. Please contact Eternal Fitness to complete your agreement." },
    { status: 410 }
  );
}
