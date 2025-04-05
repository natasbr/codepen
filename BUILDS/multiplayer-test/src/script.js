
      // -------------------------------
      // Configurações iniciais e cena 3D
      // -------------------------------
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x000000);
      
      // Física (Cannon.js)
      const world = new CANNON.World();
      world.gravity.set(0, -9.82, 0);
      world.solver.iterations = 10;
      
      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      let cameraDistance = 8;
      camera.position.set(0, 4, cameraDistance);
      
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      document.body.appendChild(renderer.domElement);
      
      // Botões de zoom
      const zoomInButton = document.createElement("button");
      zoomInButton.innerHTML = "+";
      zoomInButton.style.position = "absolute";
      zoomInButton.style.top = "10px";
      zoomInButton.style.right = "50px";
      zoomInButton.style.fontSize = "24px";
      document.body.appendChild(zoomInButton);
      
      const zoomOutButton = document.createElement("button");
      zoomOutButton.innerHTML = "-";
      zoomOutButton.style.position = "absolute";
      zoomOutButton.style.top = "10px";
      zoomOutButton.style.right = "10px";
      zoomOutButton.style.fontSize = "24px";
      document.body.appendChild(zoomOutButton);
      
      zoomInButton.addEventListener("click", () => adjustCameraZoom(-0.5));
      zoomOutButton.addEventListener("click", () => adjustCameraZoom(0.5));
      
      function adjustCameraZoom(delta) {
          cameraDistance = Math.max(5, Math.min(15, cameraDistance + delta));
      }
      
      window.addEventListener("wheel", (event) => {
          adjustCameraZoom(event.deltaY * 0.01);
      });
      
      // Iluminação
      scene.add(new THREE.AmbientLight(0xffffff, 0.5));
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
      directionalLight.position.set(5, 5, 5);
      scene.add(directionalLight);
      
      // -------------------------------
      // Configuração dos modelos e jogadores
      // -------------------------------
      const modelURLs = {
          idle: "https://raw.githubusercontent.com/natasbr/codepen/gh-pages/models/LULA/LULA%201/Animation_Idle_02_withSkin.glb",
          walk: "https://raw.githubusercontent.com/natasbr/codepen/gh-pages/models/LULA/LULA%201/Animation_Walking_withSkin.glb",
          run: "https://raw.githubusercontent.com/natasbr/codepen/gh-pages/models/LULA/LULA%201/Animation_Running_withSkin.glb",
      };
      
      // Mesmo modelo para Player 2 (com coloração alterada)
      const modelURLsP2 = { ...modelURLs };
      
      let character, mixer, animationsP1 = {}, currentAction;
      let character2, mixer2, animationsP2 = {}, currentAction2;
      const loader = new THREE.GLTFLoader();
      
      // Área e limites
      let areaSize = 8;
      let currentAreaX = 0, currentAreaZ = 0;
      let limitLines = [];
      
      function updateMovementBounds() {
          limitLines.forEach(line => scene.remove(line));
          limitLines = [];
      
          let areas = [
              [currentAreaX, currentAreaZ],
              [currentAreaX - 1, currentAreaZ],
              [currentAreaX + 1, currentAreaZ],
              [currentAreaX, currentAreaZ - 1],
              [currentAreaX, currentAreaZ + 1]
          ];
      
          areas.forEach(([ax, az]) => {
              let line = new THREE.LineSegments(
                  new THREE.EdgesGeometry(new THREE.PlaneGeometry(areaSize, areaSize)),
                  new THREE.LineBasicMaterial({ color: 0xffffff })
              );
              line.rotation.x = -Math.PI / 2;
              line.position.set(ax * areaSize, 0, az * areaSize);
              scene.add(line);
              limitLines.push(line);
          });
      }
      
      // Chão com física
      const groundMaterial = new CANNON.Material();
      const groundBody = new CANNON.Body({ mass: 0, material: groundMaterial });
      groundBody.addShape(new CANNON.Plane());
      groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
      world.addBody(groundBody);
      
      // Bola de futebol
      const ballRadius = 0.3;
      const ballGeometry = new THREE.SphereGeometry(ballRadius, 32, 32);
      const ballMaterial = new THREE.MeshStandardMaterial({
          color: 0xffff00,
          roughness: 0.5,
          metalness: 0.1
      });
      const soccerBall = new THREE.Mesh(ballGeometry, ballMaterial);
      scene.add(soccerBall);
      
      const ballBody = new CANNON.Body({
          mass: 1,
          position: new CANNON.Vec3(0, 2, 0),
          shape: new CANNON.Sphere(ballRadius),
          material: new CANNON.Material({ friction: 0.5, restitution: 0.7 })
      });
      world.addBody(ballBody);
      
      // Física do Player 1
      let playerBody;
      function createPlayerPhysics() {
          playerBody = new CANNON.Body({
              mass: 0,
              position: new CANNON.Vec3(0, 1, 0),
              shape: new CANNON.Box(new CANNON.Vec3(0.3, 1, 0.3)),
              material: new CANNON.Material()
          });
          world.addBody(playerBody);
      
          const contactMaterial = new CANNON.ContactMaterial(
              playerBody.material,
              ballBody.material,
              { friction: 0.1, restitution: 0.5 }
          );
          world.addContactMaterial(contactMaterial);
      }
      
      // Física do Player 2
      let playerBody2;
      function createPlayerPhysics2() {
          playerBody2 = new CANNON.Body({
              mass: 0,
              position: new CANNON.Vec3(2, 1, 0),
              shape: new CANNON.Box(new CANNON.Vec3(0.3, 1, 0.3)),
              material: new CANNON.Material()
          });
          world.addBody(playerBody2);
      
          const contactMaterial2 = new CANNON.ContactMaterial(
              playerBody2.material,
              ballBody.material,
              { friction: 0.1, restitution: 0.5 }
          );
          world.addContactMaterial(contactMaterial2);
      }
      
      // Controles de toque para Player 1
      let isTouchMoving = false;
      let touchDirection = { x: 0, z: 0 };
      
      window.addEventListener("touchstart", (event) => {
          isTouchMoving = true;
          const touch = event.touches[0];
          let halfWidth = window.innerWidth / 2;
          let halfHeight = window.innerHeight / 2;
          touchDirection.x = ((touch.clientX - halfWidth) / halfWidth) * -1;
          touchDirection.z = ((touch.clientY - halfHeight) / halfHeight) * -1;
      });
      
      window.addEventListener("touchend", () => {
          isTouchMoving = false;
          touchDirection = { x: 0, z: 0 };
      });
      
      // Reset da bola
      function resetBall() {
          ballBody.position.set(
              currentAreaX * areaSize,
              2,
              currentAreaZ * areaSize
          );
          ballBody.velocity.set(0, 0, 0);
          ballBody.angularVelocity.set(0, 0, 0);
      }
      
      document.addEventListener('keydown', (e) => {
          if (e.key.toUpperCase() === 'R') resetBall();
      });
      
      // Som (chute)
      const audioListener = new THREE.AudioListener();
      camera.add(audioListener);
      const kickSound = new THREE.Audio(audioListener);
      const audioLoader = new THREE.AudioLoader();
      audioLoader.load("https://www.soundjay.com/button/beep-07.mp3", buffer => {
          kickSound.setBuffer(buffer);
      });
      
      // Carregar Player 1
      function loadCharacter() {
          Object.keys(modelURLs).forEach((state) => {
              loader.load(modelURLs[state], (gltf) => {
                  if (!character) {
                      character = gltf.scene;
                      character.scale.set(1, 1, 1);
                      scene.add(character);
                      character.visible = true;
                      mixer = new THREE.AnimationMixer(character);
                      createPlayerPhysics();
                      updateMovementBounds();
                  }
                  animationsP1[state] = mixer.clipAction(gltf.animations[0]);
              });
          });
      }
      
      // Carregar Player 2
      function loadCharacter2() {
          Object.keys(modelURLsP2).forEach((state) => {
              loader.load(modelURLsP2[state], (gltf) => {
                  if (!character2) {
                      character2 = gltf.scene;
                      character2.scale.set(1, 1, 1);
                      // Altera a cor para diferenciar
                      character2.traverse((child) => {
                          if (child.isMesh) {
                              child.material = child.material.clone();
                              child.material.color.multiply(new THREE.Color(0xffaaaa));
                          }
                      });
                      character2.position.set(2, 0, 0);
                      scene.add(character2);
                      mixer2 = new THREE.AnimationMixer(character2);
                      createPlayerPhysics2();
                      updateMovementBounds();
                  }
                  animationsP2[state] = mixer2.clipAction(gltf.animations[0]);
              });
          });
      }
      
      // Funções para trocar animações
      function switchAnimation(state) {
          if (currentAction === animationsP1[state]) return;
          if (currentAction) currentAction.fadeOut(0.2);
          currentAction = animationsP1[state];
          currentAction.reset().fadeIn(0.2).play();
      }
      
      function switchAnimationP2(state) {
          if (currentAction2 === animationsP2[state]) return;
          if (currentAction2) currentAction2.fadeOut(0.2);
          currentAction2 = animationsP2[state];
          currentAction2.reset().fadeIn(0.2).play();
          return currentAction2;
      }
      
      // Atualização da câmera (centralizando entre os players)
      function updateCamera() {
          if (!character || !character2) return;
          const midX = (character.position.x + character2.position.x) / 2;
          const midZ = (character.position.z + character2.position.z) / 2;
          const midPoint = new THREE.Vector3(midX, 1, midZ);
          const distance = character.position.distanceTo(character2.position);
          const dynamicDistance = Math.min(15, Math.max(8, distance * 1.5));
          const camPosition = new THREE.Vector3(midX, dynamicDistance * 0.5 + 2, midZ + dynamicDistance);
          camera.position.lerp(camPosition, 0.1);
          camera.lookAt(midPoint);
      }
      
      // Controle do gamepad para Player 1
      function checkGamepadInput(delta) {
          const gp = navigator.getGamepads?.()[0];
          if (!gp || !character) return;
          const [x, y] = [gp.axes[0], gp.axes[1]];
          const running = gp.buttons[0].pressed;
          const moving = Math.abs(x) > 0.1 || Math.abs(y) > 0.1;
          if (moving) {
              const speed = running ? 3 : 1.5;
              switchAnimation(running ? "run" : "walk");
              playerBody.position.x += x * speed * delta;
              playerBody.position.z += y * speed * delta;
              character.rotation.y = Math.atan2(x, y);
          } else {
              switchAnimation("idle");
          }
          if (gp.buttons[3].pressed) resetBall();
          let zoomAdjust = gp.axes[3] * 0.5;
          if (Math.abs(zoomAdjust) > 0.1) adjustCameraZoom(zoomAdjust);
      }
      
      // Se não houver conexão remota ativa, o controle de gamepad do Player 2 funciona;
      // caso contrário, o movimento de Player 2 será atualizado via comando remoto.
      function checkGamepadInput2(delta) {
          if (conn) return; // se houver conexão, use os comandos remotos
          const gp2 = navigator.getGamepads?.()[1];
          if (!gp2 || !character2) return;
          const [x, y] = [gp2.axes[0], gp2.axes[1]];
          const running = gp2.buttons[0].pressed;
          const moving = Math.abs(x) > 0.1 || Math.abs(y) > 0.1;
          if (moving) {
              const speed = running ? 3 : 1.5;
              switchAnimationP2(running ? "run" : "walk");
              playerBody2.position.x += x * speed * delta;
              playerBody2.position.z += y * speed * delta;
              character2.rotation.y = Math.atan2(x, y);
          } else {
              switchAnimationP2("idle");
          }
          if (gp2.buttons[3].pressed) resetBall();
          let zoomAdjust = gp2.axes[3] * 0.5;
          if (Math.abs(zoomAdjust) > 0.1) adjustCameraZoom(zoomAdjust);
      }
      
      // -------------------------------
      // Implementação da conexão P2P para controle remoto de Player2
      // -------------------------------
      let paused = false; // controla pausa do jogo
      let connectionScreenVisible = false;
      let peer = null;
      let conn = null;
      
      // Variável para armazenar o comando remoto recebido (ex.: {x: valor, y: valor})
      let remoteCommand = { x: 0, y: 0 };
      
      // Alterna a tela de conexão quando a tecla "c" for pressionada
      document.addEventListener("keydown", (e) => {
          if (e.key.toLowerCase() === "c") {
              toggleConnectionScreen();
          }
      });
      
      function toggleConnectionScreen() {
          connectionScreenVisible = !connectionScreenVisible;
          if (connectionScreenVisible) {
              paused = true; // pausa o jogo
              showConnectionScreen();
          } else {
              paused = false; // retoma o jogo
              hideConnectionScreen();
          }
      }
      
      // Cria e exibe a tela de conexão
      const connectionDiv = document.createElement("div");
      connectionDiv.style.position = "absolute";
      connectionDiv.style.top = "0";
      connectionDiv.style.left = "0";
      connectionDiv.style.width = "100%";
      connectionDiv.style.height = "100%";
      connectionDiv.style.backgroundColor = "rgba(0,0,0,0.8)";
      connectionDiv.style.display = "flex";
      connectionDiv.style.flexDirection = "column";
      connectionDiv.style.justifyContent = "center";
      connectionDiv.style.alignItems = "center";
      connectionDiv.style.color = "#fff";
      connectionDiv.style.fontSize = "24px";
      connectionDiv.style.zIndex = "1000";
      
      function showConnectionScreen() {
          connectionDiv.innerHTML = "";
          const title = document.createElement("h2");
          title.innerText = "Conexão Online";
          connectionDiv.appendChild(title);
      
          // Opção: Criar Sala
          const createRoomInput = document.createElement("input");
          createRoomInput.type = "text";
          createRoomInput.placeholder = "Código de 4 dígitos";
          createRoomInput.maxLength = 4;
          createRoomInput.style.fontSize = "24px";
          createRoomInput.style.margin = "10px";
          connectionDiv.appendChild(createRoomInput);
      
          const createRoomButton = document.createElement("button");
          createRoomButton.innerText = "Criar Sala";
          createRoomButton.style.fontSize = "24px";
          createRoomButton.style.margin = "10px";
          createRoomButton.addEventListener("click", () => {
              const code = createRoomInput.value;
              if (code.length === 4) {
                  // Cria um peer com o código escolhido como ID
                  peer = new Peer(code, { debug: 2 });
                  peer.on("open", (id) => {
                      alert("Sala criada com o código: " + id);
                  });
                  peer.on("connection", (connection) => {
                      conn = connection;
                      setupConnection();
                  });
              } else {
                  alert("Digite um código de 4 dígitos");
              }
          });
          connectionDiv.appendChild(createRoomButton);
      
          // Opção: Conectar em uma sala existente
          const joinRoomInput = document.createElement("input");
          joinRoomInput.type = "text";
          joinRoomInput.placeholder = "Código da Sala";
          joinRoomInput.maxLength = 4;
          joinRoomInput.style.fontSize = "24px";
          joinRoomInput.style.margin = "10px";
          connectionDiv.appendChild(joinRoomInput);
      
          const joinRoomButton = document.createElement("button");
          joinRoomButton.innerText = "Conectar na Sala";
          joinRoomButton.style.fontSize = "24px";
          joinRoomButton.style.margin = "10px";
          joinRoomButton.addEventListener("click", () => {
              const code = joinRoomInput.value;
              if (code.length === 4) {
                  peer = new Peer({ debug: 2 });
                  peer.on("open", (id) => {
                      conn = peer.connect(code);
                      setupConnection();
                  });
              } else {
                  alert("Digite um código de 4 dígitos");
              }
          });
          connectionDiv.appendChild(joinRoomButton);
      
          document.body.appendChild(connectionDiv);
      }
      
      function hideConnectionScreen() {
          if (connectionDiv.parentNode) {
              connectionDiv.parentNode.removeChild(connectionDiv);
          }
      }
      
      // Configura os eventos da conexão remota
      function setupConnection() {
          if (!conn) return;
          conn.on("data", (data) => {
              // Espera um objeto com propriedades x e y para mover o Player2
              if (typeof data.x === "number" && typeof data.y === "number") {
                  remoteCommand = data;
              }
          });
          conn.on("open", () => {
              console.log("Conexão estabelecida");
          });
      }
      
      // -------------------------------
      // Loop de animação principal
      // -------------------------------
      const clock = new THREE.Clock();
      function animate() {
          requestAnimationFrame(animate);
          const delta = clock.getDelta();
      
          // Se o jogo estiver pausado (tela de conexão aberta), renderiza sem atualizar física
          if (paused) {
              renderer.render(scene, camera);
              return;
          }
      
          // Atualiza física
          world.step(1 / 60);
      
          // Sincroniza posição dos players
          if (character) {
              character.position.copy(playerBody.position);
              character.position.y -= 1;
          }
          if (character2) {
              character2.position.copy(playerBody2.position);
              character2.position.y -= 1;
          }
      
          soccerBall.position.copy(ballBody.position);
          soccerBall.quaternion.copy(ballBody.quaternion);
      
          // Colisão e chute da bola pelo Player 1
          if (character && playerBody.position.distanceTo(ballBody.position) < 0.8) {
              const kickDirection = new CANNON.Vec3(
                  playerBody.position.x - ballBody.position.x,
                  0.3,
                  playerBody.position.z - ballBody.position.z
              ).normalize();
              ballBody.applyImpulse(
                  new CANNON.Vec3(
                      kickDirection.x * 5,
                      kickDirection.y * 3,
                      kickDirection.z * 5
                  )
              );
              kickSound.play();
          }
      
          // Colisão e chute da bola pelo Player 2
          if (character2 && playerBody2.position.distanceTo(ballBody.position) < 0.8) {
              const kickDirection2 = new CANNON.Vec3(
                  playerBody2.position.x - ballBody.position.x,
                  0.3,
                  playerBody2.position.z - ballBody.position.z
              ).normalize();
              ballBody.applyImpulse(
                  new CANNON.Vec3(
                      kickDirection2.x * 5,
                      kickDirection2.y * 3,
                      kickDirection2.z * 5
                  )
              );
              kickSound.play();
          }
      
          // Atualiza mixers de animação
          if (mixer) mixer.update(delta);
          if (mixer2) mixer2.update(delta);
      
          // Controle do Player 1 (gamepad e toque)
          checkGamepadInput(delta);
          if (isTouchMoving) {
              const speed = 2;
              switchAnimation("walk");
              playerBody.position.x += touchDirection.x * speed * delta;
              playerBody.position.z += touchDirection.z * speed * delta;
              character.rotation.y = Math.atan2(touchDirection.x, touchDirection.z);
          }
      
          // Se não houver conexão remota ativa, usa o gamepad para Player 2;
          // caso contrário, aplica os comandos remotos recebidos.
          if (!conn) {
              checkGamepadInput2(delta);
          } else if (character2) {
              const speed = 2;
              playerBody2.position.x += remoteCommand.x * speed * delta;
              playerBody2.position.z += remoteCommand.y * speed * delta;
              character2.rotation.y = Math.atan2(remoteCommand.x, remoteCommand.y);
              if (Math.abs(remoteCommand.x) > 0.1 || Math.abs(remoteCommand.y) > 0.1) {
                  switchAnimationP2("walk");
              } else {
                  switchAnimationP2("idle");
              }
          }
      
          // Atualiza limites da área e câmera
          if (character && isOutsideBounds(character.position)) {
              currentAreaX = Math.round(character.position.x / areaSize);
              currentAreaZ = Math.round(character.position.z / areaSize);
              updateMovementBounds();
          }
          updateCamera();
      
          renderer.render(scene, camera);
      }
      
      function isOutsideBounds(pos) {
          return Math.abs(pos.x - currentAreaX * areaSize) > areaSize / 2 ||
                 Math.abs(pos.z - currentAreaZ * areaSize) > areaSize / 2;
      }
      
      // Handler de resize
      window.addEventListener('resize', () => {
          camera.aspect = window.innerWidth / window.innerHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(window.innerWidth, window.innerHeight);
      });
      
      // Inicializa os players e a animação
      loadCharacter();
      loadCharacter2();
      animate();
 
 