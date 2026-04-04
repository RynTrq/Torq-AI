import AVFoundation
import AppKit
import Foundation

struct CLIError: Error, CustomStringConvertible {
  let description: String
}

func saveImage(_ image: CGImage, to url: URL) throws {
  let bitmap = NSBitmapImageRep(cgImage: image)
  guard let data = bitmap.representation(using: .jpeg, properties: [.compressionFactor: 0.85]) else {
    throw CLIError(description: "Failed to encode image for \(url.path)")
  }

  try data.write(to: url)
}

let args = CommandLine.arguments

guard args.count >= 3 else {
  throw CLIError(description: "Usage: extract_video_frames.swift <video_path> <output_dir> [interval_seconds]")
}

let videoURL = URL(fileURLWithPath: args[1])
let outputDir = URL(fileURLWithPath: args[2], isDirectory: true)
let interval = Double(args.dropFirst(3).first ?? "4") ?? 4

let fm = FileManager.default
try fm.createDirectory(at: outputDir, withIntermediateDirectories: true)

let asset = AVURLAsset(url: videoURL)
let durationSeconds = CMTimeGetSeconds(asset.duration)

guard durationSeconds.isFinite, durationSeconds > 0 else {
  throw CLIError(description: "Could not determine duration for \(videoURL.path)")
}

let generator = AVAssetImageGenerator(asset: asset)
generator.appliesPreferredTrackTransform = true
generator.maximumSize = CGSize(width: 1400, height: 1400)

var times: [NSValue] = []
var second: Double = 0
while second <= durationSeconds {
  times.append(NSValue(time: CMTime(seconds: second, preferredTimescale: 600)))
  second += interval
}

if times.last?.timeValue.seconds != durationSeconds {
  times.append(NSValue(time: CMTime(seconds: durationSeconds, preferredTimescale: 600)))
}

var index = 0
var generated: [String] = []

generator.generateCGImagesAsynchronously(forTimes: times) { _, image, actualTime, result, error in
  defer { index += 1 }

  guard let image else {
    if let error {
      fputs("Frame extraction failed at \(actualTime.seconds)s: \(error.localizedDescription)\n", stderr)
    }
    return
  }

  let filename = String(format: "frame-%03d-%05.1fs.jpg", index, actualTime.seconds)
  let destination = outputDir.appendingPathComponent(filename)

  do {
    try saveImage(image, to: destination)
    generated.append(destination.path)
  } catch {
    fputs("Failed to save frame \(filename): \(error)\n", stderr)
  }

  if result == .succeeded, index == times.count - 1 {
    // no-op
  }
}

RunLoop.current.run(until: Date(timeIntervalSinceNow: min(30, max(5, durationSeconds + 2))))

let files = try fm.contentsOfDirectory(at: outputDir, includingPropertiesForKeys: nil)
  .map(\.path)
  .sorted()

for file in files {
  print(file)
}
