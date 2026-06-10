import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [feeTypes, feeCategories, faculties, levels] = await Promise.all([
      prisma.feeType.findMany({
        select: { feeName: true, category: true, description: true },
      }),
      prisma.feeType.findMany({
        select: { category: true },
      }),
      prisma.student.findMany({
        select: { faculty: true },
      }),
      prisma.student.findMany({
        select: { level: true },
      }),
    ]);

    const allFeeTypes = Array.from(
      new Set(feeTypes.map((f) => f.feeName).filter(Boolean))
    );

    const allCategories = Array.from(
      new Set(feeCategories.map((c) => c.category).filter(Boolean))
    );

    const allFaculties = Array.from(
      new Set(faculties.map((s) => s.faculty).filter(Boolean))
    );

    // Ensure numeric levels even if Prisma returns them as strings
    const allLevels = Array.from(
      new Set(
        levels
          .map((s) => s.level)
          .filter((l) => l !== null && l !== undefined)
          .map((l) => Number(l))
      )
    ).sort((a, b) => a - b);

    return NextResponse.json({
      feeTypes: allFeeTypes,
      categories: allCategories,
      feeSuggestions: feeTypes.map((feeType) => ({
        feeName: feeType.feeName,
        category: feeType.category ?? "",
        description: feeType.description ?? "",
      })),
      faculties: allFaculties,
      levels: allLevels,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch payment filter options" },
      { status: 500 }
    );
  }
}

