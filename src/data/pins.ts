import type { Pin } from "../types";

export const pins: Pin[] = [
  {
    "id": "cafe-test-001",
    "name": "테스트 카페",
    "category": "CAFE",
    "lat": 37.4539,
    "lng": 127.1273,
    "address": "경기 성남시 수정구 복정동",
    "description": "실내 동반 가능한 테스트 카페",
    "dogFriendlyScore": 4,
    "routePriorityScore": 4,
    "accessibilityScore": 5,
    "safetyScore": 4,
    "dogSizeAllowed": [
      "SMALL",
      "MEDIUM"
    ],
    "indoorAllowed": true,
    "parkingAvailable": false,
    "reservationRequired": false,
    "leashRequired": true,
    "source": "네이버지도",
    "lastChecked": "2026-05-08",
    "notes": "테스트 데이터"
  },
  {
    "id": "park-test-001",
    "name": "테스트 공원",
    "category": "PARK",
    "lat": 37.4555,
    "lng": 127.128,
    "address": "경기 성남시 수정구 복정동",
    "description": "산책 가능한 테스트 공원",
    "dogFriendlyScore": 5,
    "routePriorityScore": 5,
    "accessibilityScore": 4,
    "safetyScore": 5,
    "dogSizeAllowed": [
      "SMALL",
      "MEDIUM",
      "LARGE"
    ],
    "indoorAllowed": false,
    "parkingAvailable": false,
    "reservationRequired": false,
    "leashRequired": true,
    "source": "현장확인",
    "lastChecked": "2026-05-08",
    "notes": "테스트 데이터"
  }
];
