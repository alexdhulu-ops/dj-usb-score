cd dj-usb-inspector

sed -i 's/import React, { useState } from '"'"'react'"'"';/import { useState } from '"'"'react'"'"';/g' src/App.tsx
sed -i 's/import { calculateScore, ScoreResult }/import { calculateScore, type ScoreResult }/g' src/App.tsx

sed -i 's/import React, { useEffect, useState } from '"'"'react'"'"';/import { useEffect, useState } from '"'"'react'"'"';/g' src/components/ScoreDisplay.tsx
sed -i 's/import { ScoreResult }/import { type ScoreResult }/g' src/components/ScoreDisplay.tsx

# In src/services/audioAnalysis.ts, artist could be an array of strings in some formats, so we just take the first one or join.
sed -i 's/artist: common?.artist,/artist: Array.isArray(common?.artist) ? common?.artist.join(", ") : common?.artist,/g' src/services/audioAnalysis.ts
sed -i 's/const channelData = audioBuffer.getChannelData(0);//g' src/services/audioAnalysis.ts

sed -i 's/import { parseAudioFile, AudioMetadata }/import { parseAudioFile, type AudioMetadata }/g' src/services/fileScanner.ts

sed -i 's/import { ScanStats }/import { type ScanStats }/g' src/services/scoringEngine.test.ts

sed -i 's/import { ScanStats }/import { type ScanStats }/g' src/services/scoringEngine.ts
sed -i 's/import { AudioMetadata }.*//g' src/services/scoringEngine.ts
