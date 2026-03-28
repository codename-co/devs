#!/bin/bash
# Remove framer-motion from source files

FILES=(
  "src/pages/Index/index.tsx"
  "src/pages/Index/RecentActivity.tsx"
  "src/pages/Compare/components/TLDRCards.tsx"
  "src/pages/Compare/components/HonestTake.tsx"
  "src/pages/Compare/components/FinalCTA.tsx"
  "src/pages/Compare/components/ComparisonHero.tsx"
  "src/pages/Compare/components/AdvantagesGrid.tsx"
  "src/pages/Compare/components/FeatureTable.tsx"
  "src/pages/Compare/components/PricingComparison.tsx"
  "src/features/studio/pages/StudioPage.tsx"
)

cd /Users/arnaud/repos/codename/devs

for f in "${FILES[@]}"; do
  if [ -f "$f" ]; then
    sed -i '' "/import.*from 'framer-motion'/d" "$f"
    sed -i '' 's/<motion\.div/<div/g' "$f"
    sed -i '' 's/<\/motion\.div>/<\/div>/g' "$f"
    sed -i '' 's/<motion\.section/<section/g' "$f"
    sed -i '' 's/<\/motion\.section>/<\/section>/g' "$f"
    sed -i '' 's/<motion\.span/<span/g' "$f"
    sed -i '' 's/<\/motion\.span>/<\/span>/g' "$f"
    sed -i '' 's/<motion\.p/<p/g' "$f"
    sed -i '' 's/<\/motion\.p>/<\/p>/g' "$f"
    sed -i '' 's/ {\.\.\.motionVariants\.[a-zA-Z]*}//g' "$f"
    echo "Done: $f"
  fi
done
