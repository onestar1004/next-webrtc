import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import Modal from "../components/modal";
import { classNames } from "../helpers/classNames";
import usePageVisibility from "../hooks/pageVisibility";
import {
  text,
  vlogRecordingVideoCodecType,
  userMediaConstraints,
} from "../utils/constants";
import { capitalize } from "../utils/helpers";

export async function getStaticProps() {
  return {
    props: {},
  };
}
export default function Vlog() {
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [showError, setShowError] = useState();
  const [mediaRecorder, setMediaRecorder] = useState();
  const [recorderState, setRecorderState] = useState();
  const isPageVisible = usePageVisibility();
  const localVideoElement = useRef();
  let stream = useRef(),
    normalLocalStream = useRef();
  const resetState = () => {
    setIsRecording(false);
    setMediaRecorder(null);
    setRecorderState("");
  };
  const onModalClose = () => {
    router.push("/meeting");
  };
  const handleRecording = async () => {
    if (!isRecording) {
      try {
        stream.current = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: 1280,
            height: 720,
            sampleRate: 72000,
          },
        });
        normalLocalStream.current = await navigator.mediaDevices.getUserMedia(
          userMediaConstraints
        );
        stream.current.addTrack(normalLocalStream.current.getAudioTracks()[0]);
        setMediaRecorder(
          new MediaRecorder(stream.current, vlogRecordingVideoCodecType)
        );
        localVideoElement.current.srcObject = normalLocalStream.current;
        localVideoElement.current.play();
        localVideoElement.current.onloadedmetadata = async () => {
          if (!document.pictureInPictureElement) {
            await localVideoElement.current.requestPictureInPicture();
          }
        };
        setIsRecording(true);
      } catch (err) {
        stream.current = normalLocalStream.current = null;
        resetState();
      }
    } else {
      stream.current && stream.current.getTracks().forEach((x) => x.stop());
      normalLocalStream.current &&
        normalLocalStream.current.getTracks().forEach((x) => x.stop());
      if (mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
      } else {
        resetState();
      }
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      }
    }
  };
  useEffect(() => {
    if (!document.pictureInPictureEnabled) {
      setShowError(true);
    }
  }, []);
  useEffect(() => {
    if (mediaRecorder) {
      let recordedChunks = [];
      mediaRecorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      });
      mediaRecorder.addEventListener("stop", () => {
        let blob = new Blob(recordedChunks, {
          type: "video/webm",
        });
        let url = URL.createObjectURL(blob);
        let a = document.createElement("a");
        document.body.appendChild(a);
        a.style = "display: none";
        a.href = url;
        a.download = `${new Date().toISOString()}.webm`;
        a.click();
        window.URL.revokeObjectURL(url);
        resetState();
      });
      setRecorderState(capitalize(mediaRecorder.state));
    }
  }, [mediaRecorder]);
  useEffect(() => {
    if (mediaRecorder) {
      if (!isPageVisible && mediaRecorder.state === "inactive") {
        mediaRecorder.start();
      } else if (mediaRecorder.state === "recording") {
        mediaRecorder.pause();
      } else if (mediaRecorder.state === "paused") {
        mediaRecorder.resume();
      }
      setRecorderState(capitalize(mediaRecorder.state));
    }
  }, [isPageVisible]);
  const pageTitle = mediaRecorder && recorderState;
  return (
    <>
      <Head>
        <title>{`${pageTitle || "Vlog"} | ${text.appName}`}</title>
      </Head>
      <section className="container flex flex-wrap items-center justify-center w-full h-full px-4 mx-auto">
        {showError && (
          <Modal title="Oops..." onClose={onModalClose}>
            <p>
              Opps.... Your browser does not support required features to record
              vlog. We recommend using latest version of chrome.
            </p>
          </Modal>
        )}
        <div className="w-full text-center">
          <div className="w-full text-left md:text-center">
            <h3 className="mb-1 text-lg font-semibold">
              What all can you do here?
            </h3>
            <ul className="flex flex-col w-11/12 gap-1 mx-auto mb-5 text-left text-md md:text-center md:w-10/12 lg:w-9/12">
              <li>
                You can record your screen along with you in the screen and
                store the recording <br /> To record click button below.
              </li>
            </ul>
          </div>
          <h3 className="mb-3 font-semibold text-md">
            Read this before clicking on the button below
          </h3>
          <ul className="text-md mx-auto w-10/12 text-left list-outside list-decimal md:list-inside md:text-center md:w-8/12 lg:w-5/12 flex flex-col gap-1.5">
            <li>
              This works all on your device locally. No data is sent to any
              server.
            </li>
            <li>
              The recording will automatically pause when you focus on this
              window.
            </li>
            <li>The title of this browser window will tell you the status.</li>
            <li>
              The recording will start/resume when you focus on other windows.
            </li>
            <li>
              Click on the button below anytime to stop and download the
              recording.
            </li>
          </ul>
          <button
            type="submit"
            className={`${classNames({
              "flex-grow-0 text-white font-bold py-2 px-4 rounded transition w-full md:w-1/4 lg:w-1/6 mt-8": true,
              "bg-green-500 hover:bg-green-700": !isRecording,
              "bg-red-500 hover:bg-red-700": isRecording,
            })}`}
            onClick={handleRecording}
          >
            {`${pageTitle || "Start recording"}...`}
          </button>
        </div>
        <video
          muted
          playsInline
          controls
          className="hidden transform -scale-x-1"
          ref={localVideoElement}
        ></video>
      </section>
    </>
  );
}
